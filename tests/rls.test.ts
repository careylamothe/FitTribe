import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface TestUser {
  id: string;
  email: string;
}

let userA: TestUser;
let userB: TestUser;

async function asUser(userId: string | null, role: "authenticated" | "anon", fn: (client: any) => Promise<void>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL ROLE ${role}`);
    if (userId) {
      await client.query(`SET LOCAL request.jwt.claim.sub = '${userId}'`);
    }
    await client.query(`SET LOCAL request.jwt.claim.role = '${role}'`);
    await fn(client);
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
}

beforeAll(async () => {
  const resA = await pool.query(
    `insert into users (email, name, role) values ($1, $2, 'member') returning id, email`,
    [`rls-test-a-${Date.now()}@fittribe.test`, "User A"]
  );
  const resB = await pool.query(
    `insert into users (email, name, role) values ($1, $2, 'member') returning id, email`,
    [`rls-test-b-${Date.now()}@fittribe.test`, "User B"]
  );
  userA = resA.rows[0];
  userB = resB.rows[0];

  // Seed one calendar event per user, inserted as the superuser (bypasses RLS)
  await pool.query(
    `insert into calendar_events (user_id, title, event_date) values ($1, 'A''s class', '2026-08-01')`,
    [userA.id]
  );
  await pool.query(
    `insert into calendar_events (user_id, title, event_date) values ($1, 'B''s class', '2026-08-02')`,
    [userB.id]
  );
});

afterAll(async () => {
  await pool.query(`delete from users where id in ($1, $2)`, [userA.id, userB.id]);
  await pool.end();
});

describe("calendar_events RLS", () => {
  it("lets a user see only their own events", async () => {
    await asUser(userA.id, "authenticated", async (client) => {
      const res = await client.query("select title from calendar_events order by event_date");
      expect(res.rows.map((r: any) => r.title)).toEqual(["A's class"]);
    });
  });

  it("blocks an anonymous session from seeing any events", async () => {
    await asUser(null, "anon", async (client) => {
      const res = await client.query("select * from calendar_events");
      expect(res.rows).toHaveLength(0);
    });
  });

  it("rejects inserting an event on someone else's behalf", async () => {
    await asUser(userA.id, "authenticated", async (client) => {
      await expect(
        client.query(
          `insert into calendar_events (user_id, title, event_date) values ($1, 'Sneaky', '2026-08-03')`,
          [userB.id]
        )
      ).rejects.toThrow();
    });
  });

  it("lets a user insert their own event", async () => {
    await asUser(userA.id, "authenticated", async (client) => {
      await client.query(
        `insert into calendar_events (user_id, title, event_date) values ($1, 'New session', '2026-08-04')`,
        [userA.id]
      );
      const res = await client.query("select count(*) from calendar_events where title = 'New session'");
      expect(Number(res.rows[0].count)).toBe(1);
    });
  });
});

describe("chat_messages RLS", () => {
  it("lets any authenticated member read chat", async () => {
    await pool.query(
      `insert into chat_messages (user_id, sender_name, body) values ($1, 'User A', 'hello tribe')`,
      [userA.id]
    );

    await asUser(userB.id, "authenticated", async (client) => {
      const res = await client.query("select body from chat_messages where body = 'hello tribe'");
      expect(res.rows).toHaveLength(1);
    });
  });

  it("blocks anonymous sessions from reading chat", async () => {
    await asUser(null, "anon", async (client) => {
      const res = await client.query("select * from chat_messages");
      expect(res.rows).toHaveLength(0);
    });
  });

  it("rejects posting chat as someone else", async () => {
    await asUser(userA.id, "authenticated", async (client) => {
      await expect(
        client.query(
          `insert into chat_messages (user_id, sender_name, body) values ($1, 'Impersonator', 'fake')`,
          [userB.id]
        )
      ).rejects.toThrow();
    });
  });
});

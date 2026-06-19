import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface TestUser {
  id: string;
  email: string;
}

let userA: TestUser;
let userB: TestUser;
let admin: TestUser;

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
  const ts = Date.now();
  const resA = await pool.query(
    `insert into users (email, name, role) values ($1, $2, 'member') returning id, email`,
    [`rls-test-a-${ts}@fittribe.test`, "User A"]
  );
  const resB = await pool.query(
    `insert into users (email, name, role) values ($1, $2, 'member') returning id, email`,
    [`rls-test-b-${ts}@fittribe.test`, "User B"]
  );
  const resAdmin = await pool.query(
    `insert into users (email, name, role) values ($1, $2, 'admin') returning id, email`,
    [`rls-test-admin-${ts}@fittribe.test`, "Admin User"]
  );
  userA = resA.rows[0];
  userB = resB.rows[0];
  admin = resAdmin.rows[0];

  // Seed one calendar event per user, inserted as the superuser (bypasses RLS)
  await pool.query(
    `insert into calendar_events (user_id, title, event_date_start_time) values ($1, 'A''s class', '2026-08-01T09:00:00Z')`,
    [userA.id]
  );
  await pool.query(
    `insert into calendar_events (user_id, title, event_date_start_time) values ($1, 'B''s class', '2026-08-02T09:00:00Z')`,
    [userB.id]
  );
});

afterAll(async () => {
  await pool.query(`delete from users where id in ($1, $2, $3)`, [userA.id, userB.id, admin.id]);
  await pool.end();
});

describe("calendar_events RLS", () => {
  it("admin can insert an event and any member can read it back", async () => {
    await asUser(admin.id, "authenticated", async (client) => {
      await client.query(
        `insert into calendar_events (user_id, title, event_date_start_time) values ($1, 'Tribe HIIT', '2026-09-01T07:00:00Z')`,
        [admin.id]
      );
    });

    await asUser(userA.id, "authenticated", async (client) => {
      const res = await client.query(
        `select title from calendar_events where title = 'Tribe HIIT'`
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].title).toBe("Tribe HIIT");
    });
  });

  it("member can see all calendar events, including other users' events", async () => {
    await asUser(userA.id, "authenticated", async (client) => {
      const res = await client.query("select title from calendar_events order by event_date_start_time");
      const titles = res.rows.map((r: any) => r.title);
      expect(titles).toContain("A's class");
      expect(titles).toContain("B's class");
    });
  });

  it("member cannot insert a calendar event", async () => {
    await asUser(userA.id, "authenticated", async (client) => {
      await expect(
        client.query(
          `insert into calendar_events (user_id, title, event_date_start_time) values ($1, 'Unauthorized', '2026-09-02T07:00:00Z')`,
          [userA.id]
        )
      ).rejects.toThrow();
    });
  });

  it("unauthenticated session cannot insert a calendar event", async () => {
    await asUser(null, "anon", async (client) => {
      await expect(
        client.query(
          `insert into calendar_events (user_id, title, event_date_start_time) values ($1, 'Anon insert', '2026-09-02T07:00:00Z')`,
          [userA.id]
        )
      ).rejects.toThrow();
    });
  });

  it("unauthenticated session cannot read calendar events", async () => {
    await asUser(null, "anon", async (client) => {
      const res = await client.query("select * from calendar_events");
      expect(res.rows).toHaveLength(0);
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

import { auth } from "@/auth";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { getParticipantCounts } from "@/lib/actions/participants";
import { EventCard } from "@/components/events/EventCard";
import { revalidatePath } from "next/cache";
import type { CalendarEvent } from "@/types/database";

async function createEvent(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user) return;

  const title = formData.get("title") as string;
  const eventDateTime = formData.get("eventDateTime") as string;
  const description = (formData.get("description") as string) || null;

  if (!title || !eventDateTime) return;

  const supabase = getServerSupabaseClient();
  const { error } = await supabase.from("calendar_events").insert({
    user_id: session.user.id,
    title,
    event_date_start_time: new Date(eventDateTime).toISOString(),
    description,
  });

  if (error) console.error("[createEvent]", error);
  else revalidatePath("/dashboard/calendar");
}

export default async function CalendarPage() {
  const session = await auth();
  const supabase = getServerSupabaseClient();
  const currentUserId = session?.user?.id ?? "";

  // Fetch ALL tribe events (removed .eq("user_id", ...) so every member
  // sees the full calendar, not just events they created)
  const { data: events } = await supabase
    .from("calendar_events")
    .select("id, user_id, title, description, event_date_start_time, created_at")
    .order("event_date_start_time", { ascending: true })
    .returns<CalendarEvent[]>();

  const allEvents = events ?? [];
  const eventIds = allEvents.map((e) => e.id);

  // Fetch participant counts in ONE query (view, no N+1)
  const countMap = await getParticipantCounts(eventIds);

  // Fetch which events the current user has joined
  let myEventIds = new Set<string>();
  if (currentUserId) {
    const { data: myRows } = await supabase
      .from("event_participants")
      .select("event_id")
      .eq("user_id", currentUserId);
    myEventIds = new Set((myRows ?? []).map((r: { event_id: string }) => r.event_id));
  }

  // Fetch participant lists for all events upfront so EventCard can render
  // them immediately without a client-side fetch on expand
  const { data: allParticipantRows } = await supabase
    .from("event_participants")
    .select(`
      id,
      event_id,
      user_id,
      joined_at,
      users (
        id,
        name,
        email,
        image
      )
    `)
    .in("event_id", eventIds.length > 0 ? eventIds : [""])
    .order("joined_at", { ascending: true });

  // Group participant rows by event_id for easy lookup
  type ParticipantRow = NonNullable<typeof allParticipantRows>[number];

  const participantsByEvent = (allParticipantRows ?? []).reduce<Record<string, ParticipantRow[]>>(
    (acc, row) => {
      (acc[row.event_id] ??= []).push(row);
      return acc;
    },
    {} as Record<string, ParticipantRow[]>
  );

  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="max-w-2xl">
      {/* Only admins (tribe leaders) can add events */}
      {isAdmin && (
        <div className="rounded-xl border-2 border-ink/10 bg-canvas p-6 shadow-sm">
          <h2 className="text-lg font-bold text-ink">Add an event</h2>
          <form action={createEvent} className="mt-4 flex flex-col gap-3">
            <input
              name="title"
              type="text"
              required
              placeholder="Title"
              className="rounded-lg border-2 border-ink/20 bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-punch"
            />
            <input
              name="eventDateTime"
              type="datetime-local"
              required
              className="rounded-lg border-2 border-ink/20 bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-punch"
            />
            <textarea
              name="description"
              rows={2}
              placeholder="Notes (optional)"
              className="rounded-lg border-2 border-ink/20 bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-punch"
            />
            <button
              type="submit"
              className="self-start rounded-lg bg-punch px-4 py-2 text-sm font-bold text-white hover:bg-punch-dark"
            >
              Add Event
            </button>
          </form>
        </div>
      )}

      <div className={`rounded-xl border-2 border-ink/10 bg-canvas p-6 shadow-sm ${isAdmin ? "mt-6" : ""}`}>
        <h2 className="text-lg font-bold text-ink">Tribe calendar</h2>

        {allEvents.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            No events yet
            {isAdmin ? " — add the first one above." : "."}
          </p>
        ) : (
          <div className="mt-3 divide-y divide-ink/10">
            {allEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                participantCount={countMap[event.id] ?? 0}
                userIsGoing={myEventIds.has(event.id)}
                initialParticipants={(participantsByEvent[event.id] ?? []) as unknown as Parameters<typeof EventCard>[0]["initialParticipants"]}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

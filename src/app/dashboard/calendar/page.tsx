import { auth } from "@/auth";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { CalendarEvent } from "@/types/database";

async function createEvent(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user) return;

  const title = formData.get("title") as string;
  const eventDate = formData.get("eventDate") as string;
  const description = (formData.get("description") as string) || null;

  if (!title || !eventDate) return;

  const supabase = getServerSupabaseClient();
  await supabase.from("calendar_events").insert({
    user_id: session.user.id,
    title,
    event_date: eventDate,
    description,
  });
}

export default async function CalendarPage() {
  const session = await auth();
  const supabase = getServerSupabaseClient();

  const { data: events } = await supabase
    .from("calendar_events")
    .select("id, user_id, title, description, event_date, created_at")
    .eq("user_id", session?.user?.id)
    .order("event_date", { ascending: true })
    .returns<CalendarEvent[]>();

  return (
    <div className="max-w-2xl">
      <div className="rounded-xl border border-border bg-bg-card p-6">
        <h2 className="text-lg font-bold">Add an event</h2>
        <form action={createEvent} className="mt-4 flex flex-col gap-3">
          <input
            name="title"
            type="text"
            required
            placeholder="Title"
            className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-lime"
          />
          <input
            name="eventDate"
            type="date"
            required
            className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-lime"
          />
          <textarea
            name="description"
            rows={2}
            placeholder="Notes (optional)"
            className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-lime"
          />
          <button
            type="submit"
            className="self-start rounded-lg bg-lime px-4 py-2 text-sm font-bold text-black hover:bg-lime-dim"
          >
            Add Event
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-bg-card p-6">
        <h2 className="text-lg font-bold">Your calendar</h2>
        {!events || events.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">No events yet — add your first class above.</p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {events.map((event) => (
              <div key={event.id} className="py-3">
                <div className="text-xs font-semibold text-lime">
                  {new Date(event.event_date).toLocaleDateString()}
                </div>
                <div className="font-medium">{event.title}</div>
                {event.description && (
                  <div className="text-sm text-neutral-400">{event.description}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

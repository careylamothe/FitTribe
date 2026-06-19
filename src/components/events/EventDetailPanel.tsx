// src/components/events/EventDetailPanel.tsx
// Server Component — fetches participant data, passes to client ParticipantList.
// Drop this into your existing event detail modal or slide-over panel.

import { auth } from "@/auth";
import { getEventParticipants } from "@/lib/actions/participants";
import { ParticipantList } from "./ParticipantList";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  location?: string | null;
  event_type?: "training" | "social" | string;
}

interface Props {
  event: CalendarEvent;
}

export async function EventDetailPanel({ event }: Props) {
  const session = await auth();
  const participants = await getEventParticipants(event.id);

  const currentUserId = session?.user?.id ?? "";
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="bg-white rounded-2xl shadow-lg ring-1 ring-gray-100 overflow-hidden">
      {/* Event type pill + title */}
      <div
        className={`px-6 pt-5 pb-4 border-b border-gray-100 ${
          event.event_type === "social"
            ? "bg-amber-50"
            : "bg-indigo-50"
        }`}
      >
        <span
          className={`inline-block text-xs font-semibold uppercase tracking-widest rounded-full px-3 py-1 mb-2 ${
            event.event_type === "social"
              ? "bg-amber-100 text-amber-700"
              : "bg-indigo-100 text-indigo-700"
          }`}
        >
          {event.event_type === "social" ? "Social" : "Training"}
        </span>

        <h2 className="text-lg font-bold text-gray-900">{event.title}</h2>

        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>
            📅{" "}
            {new Date(event.start_time).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span>
            🕐{" "}
            {new Date(event.start_time).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
            {event.end_time &&
              ` – ${new Date(event.end_time).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}`}
          </span>
          {event.location && <span>📍 {event.location}</span>}
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <div className="px-6 py-4 border-b border-gray-100 text-sm text-gray-600 leading-relaxed">
          {event.description}
        </div>
      )}

      {/* Participants — client island for interactivity */}
      <div className="px-6 py-4">
        {!currentUserId ? (
          <p className="text-sm text-gray-400 italic">
            <a href="/login" className="text-indigo-600 underline">
              Sign in
            </a>{" "}
            to join this event.
          </p>
        ) : (
          <ParticipantList
            eventId={event.id}
            initialParticipants={participants}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </div>
  );
}

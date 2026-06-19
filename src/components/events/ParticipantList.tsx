// src/components/events/ParticipantList.tsx
"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { signUpForEvent, cancelSignUp, removeParticipant } from "@/lib/actions/participants";
import type { Participant } from "@/types/participants";

interface Props {
  eventId: string;
  initialParticipants: Participant[];
  currentUserId: string;
  isAdmin?: boolean;
}

export function ParticipantList({
  eventId,
  initialParticipants,
  currentUserId,
  isAdmin = false,
}: Props) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const isMember = participants.some((p) => p.user_id === currentUserId);

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function handleSignUp() {
    startTransition(async () => {
      const { error } = await signUpForEvent(eventId);
      if (error) {
        showToast(error, "err");
        return;
      }
      // Optimistically add current user (server will revalidate the real name)
      setParticipants((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          event_id: eventId,
          user_id: currentUserId,
          joined_at: new Date().toISOString(),
          users: { id: currentUserId, name: "You", email: "", image: null },
        } as Participant,
      ]);
      showToast("You're in! See you there 💪", "ok");
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const { error } = await cancelSignUp(eventId);
      if (error) {
        showToast(error, "err");
        return;
      }
      setParticipants((prev) => prev.filter((p) => p.user_id !== currentUserId));
      showToast("Spot cancelled.", "ok");
    });
  }

  function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from this event?`)) return;
    startTransition(async () => {
      const { error } = await removeParticipant(eventId, userId);
      if (error) {
        showToast(error, "err");
        return;
      }
      setParticipants((prev) => prev.filter((p) => p.user_id !== userId));
      showToast(`${name} removed.`, "ok");
    });
  }

  return (
    <div className="mt-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Going · <span className="text-indigo-600">{participants.length}</span>
        </h3>

        {/* Sign-up / Cancel CTA */}
        {isMember ? (
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="text-xs font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-full px-3 py-1 transition-colors disabled:opacity-50"
          >
            {isPending ? "Updating…" : "Cancel my spot"}
          </button>
        ) : (
          <button
            onClick={handleSignUp}
            disabled={isPending}
            className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full px-4 py-1.5 transition-colors disabled:opacity-50"
          >
            {isPending ? "Joining…" : "I'm going"}
          </button>
        )}
      </div>

      {/* Participant list */}
      {participants.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          No one signed up yet — be the first!
        </p>
      ) : (
        <ul className="space-y-2">
          {participants.map((p) => {
            const name = p.users?.name || p.users?.email || "Member";
            const isCurrentUser = p.user_id === currentUserId;

            return (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                  isCurrentUser
                    ? "bg-indigo-50 ring-1 ring-indigo-100"
                    : "hover:bg-gray-50"
                }`}
              >
                {/* Avatar */}
                <Avatar src={p.users?.image} name={name} />

                {/* Name */}
                <span className="text-sm text-gray-800 flex-1">
                  {isCurrentUser ? (
                    <span className="font-semibold text-indigo-700">
                      You
                      <span className="ml-1 font-normal text-gray-500">· {name}</span>
                    </span>
                  ) : (
                    name
                  )}
                </span>

                {/* Joined timestamp */}
                <span className="text-xs text-gray-400 hidden sm:block">
                  {formatJoinedAt(p.joined_at)}
                </span>

                {/* Admin remove button */}
                {isAdmin && !isCurrentUser && (
                  <button
                    onClick={() => handleRemove(p.user_id, name)}
                    disabled={isPending}
                    className="ml-2 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                    title="Remove from event"
                  >
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Feedback toast */}
      {toast && (
        <div
          className={`mt-4 text-sm rounded-lg px-4 py-2.5 font-medium transition-all ${
            toast.type === "ok"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────

function Avatar({ src, name }: { src?: string | null; name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={28}
        height={28}
        className="rounded-full object-cover"
      />
    );
  }

  return (
    <div className="w-7 h-7 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
      {initials}
    </div>
  );
}

function formatJoinedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

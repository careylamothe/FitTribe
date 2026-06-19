"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { signUpForEvent, cancelSignUp, removeParticipant } from "@/lib/actions/participants";
import type { Participant } from "@/types/participants";
import type { CalendarEvent } from "@/types/database";

interface Props {
  event: CalendarEvent;
  participantCount: number;
  userIsGoing: boolean;
  initialParticipants: Participant[];
  currentUserId: string;
  isAdmin?: boolean;
}

export function EventCard({
  event,
  participantCount,
  userIsGoing,
  initialParticipants,
  currentUserId,
  isAdmin = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [participants, setParticipants] = useState(initialParticipants);
  const [isGoing, setIsGoing] = useState(userIsGoing);
  const [count, setCount] = useState(participantCount);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function handleSignUp() {
    startTransition(async () => {
      const { error } = await signUpForEvent(event.id);
      if (error) { showToast(error, false); return; }
      setIsGoing(true);
      setCount((c) => c + 1);
      setParticipants((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          event_id: event.id,
          user_id: currentUserId,
          joined_at: new Date().toISOString(),
          users: { id: currentUserId, name: "You", email: "", image: null },
        } as Participant,
      ]);
      setExpanded(true);
      showToast("You're in! See you there 💪", true);
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const { error } = await cancelSignUp(event.id);
      if (error) { showToast(error, false); return; }
      setIsGoing(false);
      setCount((c) => Math.max(0, c - 1));
      setParticipants((prev) => prev.filter((p) => p.user_id !== currentUserId));
      showToast("Spot cancelled.", true);
    });
  }

  function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from this event?`)) return;
    startTransition(async () => {
      const { error } = await removeParticipant(event.id, userId);
      if (error) { showToast(error, false); return; }
      setParticipants((prev) => prev.filter((p) => p.user_id !== userId));
      setCount((c) => Math.max(0, c - 1));
      showToast(`${name} removed.`, true);
    });
  }

  const displayDate = new Date(event.event_date_start_time).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="py-3">
      {/* ── Event header row ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-punch">{displayDate}</div>
          <div className="font-medium text-ink">{event.title}</div>
          {event.description && (
            <div className="text-sm text-ink-muted">{event.description}</div>
          )}
        </div>

        {/* Participant count badge + sign-up toggle */}
        <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
          {/* Count / expand toggle */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
            style={{
              background: isGoing ? "rgba(var(--punch-rgb, 220 38 38) / 0.08)" : "rgba(0,0,0,0.05)",
              color: isGoing ? "var(--color-punch, #DC2626)" : "inherit",
            }}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
            </svg>
            {count === 0 ? "Be first" : count}
            {isGoing && count > 0 && " · You're in"}
          </button>

          {/* Sign-up / cancel */}
          {currentUserId && (
            isGoing ? (
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink disabled:opacity-40"
              >
                {isPending ? "…" : "Cancel spot"}
              </button>
            ) : (
              <button
                onClick={handleSignUp}
                disabled={isPending}
                className="rounded-lg bg-punch px-3 py-1 text-xs font-bold text-white hover:bg-punch-dark disabled:opacity-40"
              >
                {isPending ? "…" : "I'm going"}
              </button>
            )
          )}
        </div>
      </div>

      {/* ── Expandable participant list ───────────────────── */}
      {expanded && (
        <div className="mt-3 rounded-lg border border-ink/10 bg-ink/[0.02] px-3 py-2">
          {participants.length === 0 ? (
            <p className="py-1 text-xs text-ink-muted italic">
              No one signed up yet — be the first!
            </p>
          ) : (
            <ul className="space-y-1.5">
              {participants.map((p) => {
                const name = p.users?.name || p.users?.email || "Member";
                const isMe = p.user_id === currentUserId;
                return (
                  <li key={p.id} className="flex items-center gap-2">
                    <Avatar src={p.users?.image} name={name} />
                    <span className={`flex-1 text-xs ${isMe ? "font-semibold text-punch" : "text-ink"}`}>
                      {isMe ? `You · ${name}` : name}
                    </span>
                    <span className="text-xs text-ink-muted hidden sm:block">
                      {formatJoinedAt(p.joined_at)}
                    </span>
                    {isAdmin && !isMe && (
                      <button
                        onClick={() => handleRemove(p.user_id, name)}
                        disabled={isPending}
                        className="ml-1 text-xs text-ink-muted hover:text-red-500 disabled:opacity-40"
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
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────── */}
      {toast && (
        <div
          className={`mt-2 rounded-lg px-3 py-2 text-xs font-medium ${
            toast.ok
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
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
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (src) {
    return (
      <Image src={src} alt={name} width={22} height={22} className="rounded-full object-cover" />
    );
  }
  return (
    <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-punch/10 text-[10px] font-bold text-punch">
      {initials}
    </div>
  );
}

function formatJoinedAt(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

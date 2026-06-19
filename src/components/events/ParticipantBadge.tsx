// src/components/events/ParticipantBadge.tsx
// Lightweight badge shown on calendar event cards.
// Receives the count from the parent (no extra fetch needed).

interface Props {
  count: number;
  /** Highlight in indigo when the current user is a participant */
  userIsGoing?: boolean;
}

export function ParticipantBadge({ count, userIsGoing = false }: Props) {
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <PersonIcon />
        Be first
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        userIsGoing
          ? "bg-indigo-100 text-indigo-700"
          : "bg-gray-100 text-gray-600"
      }`}
      title={`${count} member${count === 1 ? "" : "s"} going`}
    >
      <PersonIcon />
      {count}
      {userIsGoing && <span className="ml-0.5">· You're in</span>}
    </span>
  );
}

function PersonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-3.5 h-3.5"
      aria-hidden="true"
    >
      <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
    </svg>
  );
}

import { Presence } from "@/types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function PresenceAvatars({
  presences,
  max = 5,
}: {
  presences: Presence[];
  max?: number;
}) {
  const visible = presences.slice(0, max);
  const remaining = presences.length - max;

  if (presences.length === 0) return null;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((p) => (
        <div
          key={p.user_id}
          className="group relative"
          title={p.user.full_name}
        >
          {p.user.avatar_url ? (
            <img
              src={p.user.avatar_url}
              alt={p.user.full_name}
              className="h-8 w-8 rounded-full border-2 border-white object-cover dark:border-gray-900"
            />
          ) : (
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-medium text-white dark:border-gray-900 ${colorForName(p.user.full_name)}`}
            >
              {getInitials(p.user.full_name)}
            </div>
          )}
          <div className="absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white shadow group-hover:block dark:bg-gray-200 dark:text-gray-900">
            {p.user.full_name}
          </div>
        </div>
      ))}
      {remaining > 0 && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600 dark:border-gray-900 dark:bg-gray-700 dark:text-gray-300">
          +{remaining}
        </div>
      )}
    </div>
  );
}

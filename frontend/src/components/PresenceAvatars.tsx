import { Presence } from "@/types";
import { avatarColor, avatarInitials } from "@/components/ActivityFeed";

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
    <div className="flex items-center -space-x-2.5">
      {visible.map((p, i) => (
        <div
          key={p.user_id}
          className="group relative"
          title={p.user.full_name}
          style={{ zIndex: 10 - i }}
        >
          {p.user.avatar_url ? (
            <img
              src={p.user.avatar_url}
              alt={p.user.full_name}
              className="h-8 w-8 rounded-full border-2 border-[var(--koda-surface)] object-cover shadow-soft-sm transition-transform duration-200 group-hover:scale-110"
            />
          ) : (
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--koda-surface)] bg-gradient-to-br text-xs font-bold text-white shadow-soft-sm transition-transform duration-200 group-hover:scale-110 ${avatarColor(p.user.full_name)}`}
            >
              {avatarInitials(p.user.full_name)}
            </div>
          )}
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--koda-surface)] bg-emerald-500"
          />
          <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--koda-border)] bg-[var(--koda-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--koda-text)] shadow-float group-hover:block">
            {p.user.full_name}
          </div>
        </div>
      ))}
      {remaining > 0 && (
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--koda-surface)] bg-[var(--koda-surface-2)] text-xs font-bold text-[var(--koda-text-muted)] shadow-soft-sm">
          +{remaining}
        </div>
      )}
    </div>
  );
}
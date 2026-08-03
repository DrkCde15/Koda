import { Activity } from "@/types";
import { Icon, IconName } from "@/components/ui/icons";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes === 1) return "1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hora";
  if (hours < 24) return `${hours} horas`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

const ACTION_META: Record<string, { icon: IconName; tone: string }> = {
  page_created: { icon: "page", tone: "text-brand-600 bg-brand-500/10 dark:text-brand-300" },
  page_updated: { icon: "edit", tone: "text-sky-600 bg-sky-500/10 dark:text-sky-300" },
  page_deleted: { icon: "trash", tone: "text-red-500 bg-red-500/10" },
  page_restored: { icon: "refresh", tone: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-300" },
  comment_added: { icon: "activity", tone: "text-violet-600 bg-violet-500/10 dark:text-violet-300" },
  member_added: { icon: "users", tone: "text-teal-600 bg-teal-500/10 dark:text-teal-300" },
  member_removed: { icon: "users", tone: "text-red-500 bg-red-500/10" },
  member_role_changed: { icon: "settings", tone: "text-amber-600 bg-amber-500/10 dark:text-amber-300" },
  workspace_updated: { icon: "settings", tone: "text-zinc-600 bg-zinc-500/10 dark:text-zinc-300" },
  file_uploaded: { icon: "upload", tone: "text-indigo-600 bg-indigo-500/10 dark:text-indigo-300" },
  database_created: { icon: "database", tone: "text-fuchsia-600 bg-fuchsia-500/10 dark:text-fuchsia-300" },
  block_added: { icon: "plus", tone: "text-brand-600 bg-brand-500/10 dark:text-brand-300" },
};

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--koda-surface-2)] text-[var(--koda-text-faint)]">
          <Icon name="activity" className="h-4 w-4" />
        </span>
        <p className="text-sm text-[var(--koda-text-muted)]">Nenhuma atividade recente.</p>
      </div>
    );
  }

  return (
    <ul className="relative space-y-3 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-[var(--koda-border)]">
      {activities.map((a) => {
        const meta = ACTION_META[a.action] ?? { icon: "activity" as IconName, tone: "text-zinc-600 bg-zinc-500/10 dark:text-zinc-300" };
        return (
          <li key={a.id} className="relative flex items-start gap-3 pl-1">
            <span className={`relative z-10 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--koda-border)] ${meta.tone}`}>
              <Icon name={meta.icon} className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-[var(--koda-border)] bg-[var(--koda-surface)] px-3.5 py-2.5 transition-colors duration-150 hover:bg-[var(--koda-surface-2)]/50">
              <p className="text-sm leading-relaxed text-[var(--koda-text-muted)]">
                <span className="font-semibold text-[var(--koda-text)]">
                  {a.user?.full_name || "Alguém"}
                </span>{" "}
                {a.message}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-[var(--koda-text-faint)]">
                <Icon name="clock" className="h-3 w-3" />
                {timeAgo(a.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = [
    "from-brand-500 to-violet-500",
    "from-sky-500 to-cyan-400",
    "from-emerald-500 to-teal-400",
    "from-amber-500 to-orange-500",
    "from-fuchsia-500 to-pink-500",
  ];
  return colors[Math.abs(hash) % colors.length];
}

export { initials as avatarInitials };
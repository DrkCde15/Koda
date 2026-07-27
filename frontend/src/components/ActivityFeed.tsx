import { Activity } from "@/types";

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

const ACTION_ICONS: Record<string, string> = {
  page_created: "📄",
  page_updated: "✏️",
  page_deleted: "🗑️",
  page_restored: "♻️",
  comment_added: "💬",
  member_added: "👤",
  member_removed: "🚫",
  member_role_changed: "🔄",
  workspace_updated: "⚙️",
  file_uploaded: "📎",
  database_created: "🗃️",
  block_added: "🧱",
};

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Nenhuma atividade recente.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {activities.map((a) => (
        <li
          key={a.id}
          className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <span className="mt-0.5 text-lg">
            {ACTION_ICONS[a.action] || "📌"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-gray-900 dark:text-white">
              <span className="font-medium">{a.user?.full_name || "Alguém"}</span>{" "}
              {a.message}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {timeAgo(a.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

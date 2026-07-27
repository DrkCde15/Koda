import { ReactNode, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceService } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";
import { useThemeStore } from "@/store/themeStore";
import { commentService } from "@/services/pages";

function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema"
      title={isDark ? "Modo claro" : "Modo escuro"}
      className="btn-ghost h-9 w-9 rounded-md p-0"
    >
      {isDark ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export function AppLayout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNotifications, setShowNotifications] = useState(false);
  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspaceService.list(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => commentService.listNotifications(),
    staleTime: 0,
  });

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const handleReadNotification = async (id: number) => {
    await commentService.markNotificationRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 dark:bg-gray-950 dark:text-white">
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <Link to="/" className="flex items-center px-4 py-4">
          <img src="/logo.png" alt="Koda" className="h-8 w-auto" />
        </Link>
        <nav className="flex-1 overflow-y-auto px-2">
          <p className="px-2 py-2 text-xs font-semibold uppercase text-gray-400 dark:text-gray-300">
            Workspaces
          </p>
          {workspaces.map((ws) => (
            <NavLink
              key={ws.id}
              to={`/workspaces/${ws.id}`}
              className={({ isActive }) =>
                `block rounded-md px-2 py-2 text-sm ${
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-200"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`
              }
            >
              <span className="mr-2">{ws.icon || "📁"}</span>
              {ws.name}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-3 dark:border-gray-700">
          <Link
            to="/profile"
            className="mb-2 block truncate rounded-md px-2 py-1 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {user?.full_name}
          </Link>
          <button onClick={handleLogout} className="btn-ghost w-full">
            Sair
          </button>
        </div>
      </aside>
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-900">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-200">
            Olá, {user?.full_name?.split(" ")[0] ?? "usuário"}
          </span>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((value) => !value)}
                className="btn-ghost h-9 rounded-md px-3 text-sm"
              >
                🔔 {unreadCount > 0 ? `(${unreadCount})` : ""}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">Notificações</span>
                    <button className="text-xs text-brand-600" onClick={() => setShowNotifications(false)}>
                      Fechar
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhuma notificação ainda.</p>
                  ) : (
                    <ul className="space-y-2">
                      {notifications.slice(0, 6).map((item) => (
                        <li key={item.id} className="rounded-md border border-gray-200 p-2 text-sm dark:border-gray-700">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{item.title}</p>
                              <p className="text-gray-500 dark:text-gray-400">{item.body}</p>
                            </div>
                            {!item.is_read && (
                              <button className="text-xs text-brand-600" onClick={() => handleReadNotification(item.id)}>
                                Marcar lida
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <ThemeToggle />
            <Link to="/profile" className="btn-ghost h-9 rounded-md px-3 text-sm">
              Perfil
            </Link>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  );
}

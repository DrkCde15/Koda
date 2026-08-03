import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceService } from "@/services/auth";
import { pageService } from "@/services/pages";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useThemeStore } from "@/store/themeStore";
import { useUiStore } from "@/store/uiStore";
import { commentService } from "@/services/pages";
import { useDialog } from "@/contexts/DialogContext";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";
import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";

function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema (Ctrl+Shift+L)"
      title="Alternar tema (Ctrl+Shift+L)"
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

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function AppLayout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const toast = useToast();
  const toggleTheme = useThemeStore((s) => s.toggle);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useRealtimeNotifications();

  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspaceService.list(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => commentService.listNotifications(),
    staleTime: 0,
  });

  const pathWorkspaceId = useMemo(() => {
    const m = location.pathname.match(/^\/workspaces\/(\d+)/);
    return m ? Number(m[1]) : null;
  }, [location.pathname]);

  const pathPageId = useMemo(() => {
    const m = location.pathname.match(/^\/pages\/(\d+)/);
    return m ? Number(m[1]) : null;
  }, [location.pathname]);

  const { data: sidebarPage } = useQuery({
    queryKey: ["page", pathPageId],
    queryFn: () => pageService.get(pathPageId!),
    enabled: !!pathPageId && pathWorkspaceId === null,
  });

  const activeWorkspaceId =
    pathWorkspaceId ?? sidebarPage?.workspace_id ?? workspaces[0]?.id ?? null;

  const createPage = useMutation({
    mutationFn: (opts: { workspaceId: number; title: string; icon?: string }) =>
      pageService.create(opts.workspaceId, {
        title: opts.title || "Sem título",
        icon: opts.icon,
      }),
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: ["pages-all", page.workspace_id] });
      navigate(`/pages/${page.id}`);
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  async function handleNewPage() {
    if (!activeWorkspaceId) {
      toast.push("Crie um workspace primeiro", "info");
      navigate("/");
      return;
    }
    const result = await dialog.prompt({
      title: "Nova página",
      confirmLabel: "Criar",
      fields: [
        { name: "title", label: "Nome", defaultValue: "Sem título", required: true },
        { name: "icon", label: "Ícone (emoji)", defaultValue: "📄" },
      ],
    });
    if (!result?.title) return;
    createPage.mutate({
      workspaceId: activeWorkspaceId,
      title: result.title.trim(),
      icon: result.icon || undefined,
    });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (mod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (isTypingTarget(e.target)) return;
      if (mod && e.key === "n") {
        e.preventDefault();
        handleNewPage();
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        toggleTheme();
      } else if (mod && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId, handleNewPage]);

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
    <div className="flex h-screen bg-[var(--koda-bg)] text-zinc-800 dark:text-zinc-100">
      <Sidebar workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white px-6 py-2.5 dark:border-zinc-800 dark:bg-surface-dark">
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Olá, {user?.full_name?.split(" ")[0] ?? "usuário"}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden h-9 w-64 items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-400 shadow-sm transition-colors hover:border-zinc-300 hover:text-zinc-500 sm:flex dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:border-zinc-600"
              title="Buscar (Ctrl+K)"
            >
              <span className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                Buscar…
              </span>
              <kbd className="kbd">Ctrl K</kbd>
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((value) => !value)}
                className="btn-ghost relative h-9 rounded-lg px-3 text-sm"
                title="Notificações"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="badge absolute -right-1.5 -top-1.5 h-4 min-w-4 bg-red-600 px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="animate-scale-in absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-soft-lg dark:border-zinc-800 dark:bg-surface-dark">
                  <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                    <span className="text-sm font-semibold tracking-tight">Notificações</span>
                    <button className="text-xs font-medium text-brand-600 hover:text-brand-700" onClick={() => setShowNotifications(false)}>
                      Fechar
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-zinc-500">Nenhuma notificação ainda.</p>
                  ) : (
                    <ul className="max-h-80 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
                      {notifications.slice(0, 6).map((item) => (
                        <li key={item.id} className="px-4 py-2.5 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{item.title}</p>
                              <p className="line-clamp-2 text-zinc-500 dark:text-zinc-400">{item.body}</p>
                            </div>
                            {!item.is_read && (
                              <button
                                className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700"
                                onClick={() => handleReadNotification(item.id)}
                              >
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
            <Link to="/profile" className="btn-ghost h-9 rounded-lg px-3 text-sm">
              Perfil
            </Link>
            <button onClick={handleLogout} className="btn-ghost h-9 rounded-lg px-3 text-sm">
              Sair
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {children ?? <Outlet />}
        </div>
      </main>

      <CommandPalette
        open={paletteOpen}
        currentWorkspaceId={activeWorkspaceId}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}

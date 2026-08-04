import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authService, workspaceService } from "@/services/auth";
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
import { Icon } from "@/components/ui/icons";

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
      className="btn-icon relative overflow-hidden"
    >
      <span
        className="transition-all duration-500"
        style={{
          transform: isDark ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0)",
          opacity: isDark ? 1 : 0,
          position: "absolute",
        }}
      >
        <Icon name="moon" />
      </span>
      <span
        className="transition-all duration-500"
        style={{
          transform: isDark ? "rotate(-90deg) scale(0)" : "rotate(0deg) scale(1)",
          opacity: isDark ? 0 : 1,
        }}
      >
        <Icon name="sun" />
      </span>
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

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function AppLayout({ children }: { children?: ReactNode }) {
  const { user, isAuthenticated, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const toast = useToast();
  const toggleTheme = useThemeStore((s) => s.toggle);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  useRealtimeNotifications();

  const { data: meData } = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => authService.me(),
    enabled: isAuthenticated && !user,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (meData) {
      setUser(meData);
    }
  }, [meData, setUser]);

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

  const activeWorkspaceId = useMemo(() => {
    if (pathWorkspaceId) return pathWorkspaceId;
    if (pathPageId && sidebarPage?.workspace_id) return sidebarPage.workspace_id;
    return null;
  }, [pathWorkspaceId, pathPageId, sidebarPage?.workspace_id]);

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

  useEffect(() => {
    if (!showNotifications) return;
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [showNotifications]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const handleReadNotification = async (id: number) => {
    await commentService.markNotificationRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const userDisplayName = user?.full_name?.trim() || user?.email?.split("@")[0] || "usuário";
  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;

  return (
    <div className="bg-app flex h-screen text-[var(--koda-text)]">
      <Sidebar workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />

      <main className="flex min-w-0 flex-1 flex-col">
        {/* ---- Glass top bar ---- */}
        <header className="glass-subtle z-30 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5 lg:px-6"
          style={{ borderColor: "var(--koda-border)" }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              className="btn-icon shrink-0 lg:hidden"
              title="Recolher/expandir sidebar"
            >
              <Icon name="grid" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-gradient text-sm text-white shadow-glow-brand">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  userDisplayName.charAt(0).toUpperCase()
                )}
              </span>
              <span className="truncate font-semibold text-[var(--koda-text)]">{userDisplayName}</span>
              {activeWs && (
                <>
                  <span className="mx-1 h-4 w-px bg-[var(--koda-border)]" />
                  <span className="flex items-center gap-1.5 truncate text-[var(--koda-text-muted)]">
                    <span className="text-xs">{activeWs.icon || "📁"}</span>
                    {activeWs.name}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="group hidden h-9 w-64 items-center justify-between gap-2 rounded-xl border bg-[var(--koda-surface)] px-3 text-sm text-[var(--koda-text-faint)] shadow-soft-sm transition-all duration-200 hover:border-brand-500/40 hover:text-[var(--koda-text-muted)] sm:flex"
              style={{ borderColor: "var(--koda-border)" }}
              title="Buscar (Ctrl+K)"
            >
              <span className="flex items-center gap-2.5">
                <Icon name="search" className="h-4 w-4" />
                Buscar…
              </span>
              <kbd className="kbd">Ctrl K</kbd>
            </button>

            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setShowNotifications((v) => !v)}
                className="btn-icon relative"
                title="Notificações"
              >
                <Icon name="bell" />
                {unreadCount > 0 && (
                  <span className="animate-pop absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-500 px-1 text-[10px] font-bold text-white shadow">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="animate-slide-down absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border bg-[var(--koda-surface)] shadow-float"
                  style={{ borderColor: "var(--koda-border)" }}
                >
                  <div className="flex items-center justify-between border-b px-4 py-3"
                    style={{ borderColor: "var(--koda-border)" }}
                  >
                    <span className="text-sm font-semibold tracking-tight">Notificações</span>
                    {unreadCount > 0 && (
                      <span className="badge bg-brand-500/10 text-brand-600 dark:text-brand-300">
                        {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--koda-surface-2)] text-[var(--koda-text-faint)]">
                        <Icon name="bell" className="h-4 w-4" />
                      </span>
                      <p className="text-sm text-[var(--koda-text-muted)]">Nenhuma notificação ainda.</p>
                    </div>
                  ) : (
                    <ul className="max-h-80 divide-y divide-[var(--koda-border)] overflow-y-auto">
                      {notifications.slice(0, 8).map((item) => (
                        <li key={item.id} className={`px-4 py-3 transition-colors duration-150 ${!item.is_read ? "bg-brand-500/[0.04]" : ""}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[var(--koda-text)]">
                                {!item.is_read && (
                                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand-500 align-middle" />
                                )}
                                {item.title}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--koda-text-muted)]">
                                {item.body}
                              </p>
                              <p className="mt-1 text-[10px] font-medium text-[var(--koda-text-faint)]">
                                {timeAgo(item.created_at)}
                              </p>
                            </div>
                            {!item.is_read && (
                              <button
                                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-500/10 dark:text-brand-300"
                                onClick={() => handleReadNotification(item.id)}
                              >
                                Ler
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

            <Link to="/profile" className="btn-icon" title="Perfil">
              <Icon name="settings" />
            </Link>

            <button
              onClick={handleLogout}
              className="btn-icon hover:!text-red-500"
              title="Sair"
            >
              <Icon name="logout" />
            </button>
          </div>
        </header>

        {/* ---- Page content with route transition ---- */}
        <div className="flex-1 overflow-y-auto">
          <div key={location.pathname} className="page-enter mx-auto h-full w-full max-w-[1400px]">
            {children ?? <Outlet />}
          </div>
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
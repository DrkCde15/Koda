import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { pageService } from "@/services/pages";
import { Page, Workspace } from "@/types";
import { useDialog } from "@/contexts/DialogContext";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";
import { useUiStore } from "@/store/uiStore";
import { Icon } from "@/components/ui/icons";

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId?: number | null;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-3 w-3 transition-transform duration-300 ${open ? "rotate-90" : ""}`}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function PageNode({ page, workspaceId, depth }: { page: Page; workspaceId: number; depth: number }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dialog = useDialog();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const isActive = location.pathname === `/pages/${page.id}`;

  const createSubpage = useMutation({
    mutationFn: (opts: { title: string; icon?: string }) =>
      pageService.create(workspaceId, {
        title: opts.title,
        icon: opts.icon,
        parent_id: page.id,
      }),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ["pages-all", workspaceId] });
      navigate(`/pages/${p.id}`);
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  async function handleAddChild() {
    const result = await dialog.prompt({
      title: "Nova subpágina",
      confirmLabel: "Criar",
      fields: [
        { name: "title", label: "Nome", defaultValue: "Sem título", required: true },
        { name: "icon", label: "Ícone (emoji)", defaultValue: "📄" },
      ],
    });
    if (!result?.title) return;
    createSubpage.mutate({ title: result.title.trim(), icon: result.icon || undefined });
  }

  const hasChildren = !!page.children && page.children.length > 0;

  return (
    <li>
      <div
        className={`group flex items-center gap-0.5 rounded-lg pr-1 transition-all duration-150 ${
          isActive
            ? "nav-link-active"
            : "hover:bg-[var(--koda-surface-2)]"
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="w-4 shrink-0 text-[var(--koda-text-faint)] transition-colors hover:text-[var(--koda-text)]"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Recolher" : "Expandir"}
          >
            <Chevron open={expanded} />
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => navigate(`/pages/${page.id}`)}
          className={`flex-1 truncate py-1.5 text-left text-sm transition-colors ${
            isActive
              ? "font-semibold text-[var(--koda-text)]"
              : "text-[var(--koda-text-muted)] hover:text-[var(--koda-text)]"
          }`}
          title={page.title}
        >
          <span className="mr-1.5 opacity-80">{page.icon || "📄"}</span>
          {page.title}
        </button>
        <button
          type="button"
          className={`shrink-0 rounded-md p-0.5 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:scale-110 ${
            isActive ? "text-brand-500" : "text-[var(--koda-text-faint)] hover:text-brand-500"
          }`}
          title="Adicionar subpágina"
          onClick={handleAddChild}
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
        </button>
      </div>
      {hasChildren && expanded && page.children && (
        <ul className="relative space-y-0.5">
          <span
            aria-hidden
            className="absolute left-[13px] top-0 bottom-0 w-px bg-[var(--koda-border)]"
          />
          {page.children.map((child) => (
            <PageNode
              key={child.id}
              page={child}
              workspaceId={workspaceId}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function Section({
  title,
  icon,
  sectionKey,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  sectionKey: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const collapsed = useUiStore((s) => s.collapsedSections[sectionKey]);
  const toggleSection = useUiStore((s) => s.toggleSection);
  return (
    <div className="mb-2">
      <div className="group flex items-center">
        <button
          type="button"
          className="flex flex-1 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--koda-text-faint)] transition-colors hover:text-[var(--koda-text-muted)]"
          onClick={() => toggleSection(sectionKey)}
        >
          <span
            className={
              collapsed ? "transition-transform duration-300" : "rotate-90 transition-transform duration-300"
            }
          >
            <Chevron open={!collapsed} />
          </span>
          <span className="mr-0.5">{icon}</span>
          {title}
        </button>
        <div className="pr-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {action}
        </div>
      </div>
      {!collapsed && (
        <div className="mt-0.5 space-y-0.5">
          <div className="overflow-hidden transition-all duration-300">{children}</div>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ workspaces, activeWorkspaceId }: SidebarProps) {
  const navigate = useNavigate();
  const dialog = useDialog();
  const toast = useToast();
  const queryClient = useQueryClient();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);

  const { data: allPages = [] } = useQuery({
    queryKey: ["pages-all", activeWs?.id],
    queryFn: () => pageService.list(activeWs!.id, undefined, true),
    enabled: !!activeWs,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", activeWs?.id],
    queryFn: () => pageService.favorites(activeWs!.id),
    enabled: !!activeWs,
  });

  const createRootPage = useMutation({
    mutationFn: (opts: { title: string; icon?: string }) =>
      pageService.create(activeWs!.id, {
        title: opts.title,
        icon: opts.icon,
      }),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ["pages-all", activeWs?.id] });
      navigate(`/pages/${p.id}`);
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  async function handleNewPage() {
    const result = await dialog.prompt({
      title: "Nova página",
      confirmLabel: "Criar",
      fields: [
        { name: "title", label: "Nome", defaultValue: "Sem título", required: true },
        { name: "icon", label: "Ícone (emoji)", defaultValue: "📄" },
      ],
    });
    if (!result?.title) return;
    createRootPage.mutate({ title: result.title.trim(), icon: result.icon || undefined });
  }

  const tree: Page[] = (() => {
    const byParent = new Map<number | null, Page[]>();
    allPages.forEach((p) => {
      const key = p.parent_id ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(p);
    });
    const attach = (pages: Page[]): Page[] =>
      pages.map((p) => ({ ...p, children: attach(byParent.get(p.id) || []) }));
    return attach(byParent.get(null) || []);
  })();

  /* ---------- Collapsed icon rail ---------- */
  if (collapsed) {
    return (
      <aside className="relative z-40 flex w-16 shrink-0 flex-col items-center border-r bg-[var(--koda-surface)] py-4 transition-all duration-300"
        style={{ borderColor: "var(--koda-border)" }}
      >
        <Link to="/" className="mb-5" title="Koda">
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[var(--koda-surface)] shadow-float transition-transform duration-300 hover:scale-105">
            <img src="/logo.png?v=3" alt="Koda" className="h-9 w-9 object-contain" />
          </span>
        </Link>

        <nav className="flex w-full flex-1 flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="btn-icon"
            title="Início"
          >
            <Icon name="home" />
          </button>
          {activeWs && (
            <button
              type="button"
              onClick={() => navigate(`/workspaces/${activeWs.id}`)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-base transition-all duration-200 hover:scale-110 hover:bg-[var(--koda-surface-2)]"
              title={activeWs.name}
            >
              {activeWs.icon || "📁"}
            </button>
          )}
          {workspaces.slice(0, 4).map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => navigate(`/workspaces/${ws.id}`)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm opacity-70 transition-all duration-200 hover:scale-105 hover:opacity-100"
              title={ws.name}
            >
              {ws.icon || "📁"}
            </button>
          ))}
        </nav>

        <div className="flex flex-col items-center gap-1.5">
          <button type="button" onClick={toggleSidebar} className="btn-icon" title="Expandir (Ctrl+\)">
            <Icon name="chevronRight" />
          </button>
        </div>
      </aside>
    );
  }

  /* ---------- Expanded sidebar ---------- */
  return (
    <aside
      className="relative z-40 flex w-64 shrink-0 flex-col border-r bg-[var(--koda-surface)] transition-[width] duration-300 ease-spring"
      style={{ borderColor: "var(--koda-border)" }}
    >
      <div className="flex items-center justify-between border-b px-4 py-3.5"
        style={{ borderColor: "var(--koda-border)" }}
      >
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-[var(--koda-surface)] shadow-float transition-transform duration-300 group-hover:scale-105">
            <img src="/logo.png?v=3" alt="Koda" className="h-9 w-9 object-contain" />
          </span>
          <span className="text-lg font-bold tracking-tight">Koda</span>
        </Link>
        <button
          type="button"
          className="btn-icon h-8 w-8"
          onClick={toggleSidebar}
          title="Recolher sidebar (Ctrl+\)"
        >
          <Icon name="chevronLeft" className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {activeWs && (
          <button
            type="button"
            onClick={() => navigate(`/workspaces/${activeWs.id}`)}
            className="shine mb-4 flex w-full items-center gap-2.5 rounded-xl border border-brand-500/25 bg-brand-gradient-soft px-2.5 py-2 text-sm font-semibold text-[var(--koda-text)] transition-all duration-200 hover:-translate-y-px hover:border-brand-500/40 hover:shadow-glow-brand"
            title={activeWs.name}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--koda-surface)] text-base shadow-soft-sm">
              {activeWs.icon || "📁"}
            </span>
            <span className="truncate">{activeWs.name}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate("/")}
          className={`nav-link mb-2 ${location.pathname === "/" ? "nav-link-active" : ""}`}
        >
          <Icon name="home" className="h-4 w-4" />
          Início
        </button>

        {favorites.length > 0 && (
          <Section title="Favoritos" icon={<Icon name="star" className="h-3 w-3" />} sectionKey="favorites">
            {favorites.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/pages/${p.id}`)}
                className={`block w-full truncate rounded-lg px-2.5 py-1.5 pl-5 text-left text-sm transition-colors ${
                  location.pathname === `/pages/${p.id}`
                    ? "font-semibold text-[var(--koda-text)]"
                    : "text-[var(--koda-text-muted)] hover:bg-[var(--koda-surface-2)] hover:text-[var(--koda-text)]"
                }`}
                title={p.title}
              >
                {p.icon || "📄"} {p.title}
              </button>
            ))}
          </Section>
        )}

        <Section
          title="Páginas"
          icon={<Icon name="file" className="h-3 w-3" />}
          sectionKey={`pages-${activeWs?.id ?? "none"}`}
          action={
            <button
              type="button"
              className="rounded-md p-0.5 text-[var(--koda-text-faint)] transition-all duration-150 hover:scale-110 hover:text-brand-500"
              title="Nova página"
              onClick={handleNewPage}
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
            </button>
          }
        >
          {activeWs &&
            (tree.length === 0 ? (
              <p className="px-2.5 py-1.5 pl-5 text-xs text-[var(--koda-text-faint)]">
                Nenhuma página ainda.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {tree.map((p) => (
                  <PageNode key={p.id} page={p} workspaceId={activeWs.id} depth={0} />
                ))}
              </ul>
            ))}
        </Section>

        <Section
          title="Workspaces"
          icon={<Icon name="folder" className="h-3 w-3" />}
          sectionKey="workspaces"
        >
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              to={`/workspaces/${ws.id}`}
              className={`block truncate rounded-lg px-2.5 py-1.5 pl-5 text-sm transition-all duration-150 ${
                ws.id === activeWs?.id
                  ? "nav-link-active font-medium"
                  : "text-[var(--koda-text-muted)] hover:bg-[var(--koda-surface-2)] hover:text-[var(--koda-text)]"
              }`}
            >
              <span className="mr-1.5 opacity-80">{ws.icon || "📁"}</span>
              {ws.name}
            </Link>
          ))}
          {workspaces.length === 0 && (
            <p className="px-2.5 py-1.5 pl-5 text-xs text-[var(--koda-text-faint)]">
              Nenhum workspace.
            </p>
          )}
        </Section>
      </nav>

      <div className="border-t px-3 py-3" style={{ borderColor: "var(--koda-border)" }}>
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors duration-200 hover:bg-[var(--koda-surface-2)]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow-brand">
            <Icon name="grid" className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-[var(--koda-text)]">
              {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
            </span>
            <span className="block text-[10px] text-[var(--koda-text-faint)]">
              Gerenciar no perfil
            </span>
          </span>
        </button>
      </div>
    </aside>
  );
}
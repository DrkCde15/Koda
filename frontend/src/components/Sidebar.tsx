import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { pageService } from "@/services/pages";
import { Page, Workspace } from "@/types";
import { useDialog } from "@/contexts/DialogContext";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";
import { useUiStore } from "@/store/uiStore";

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId?: number | null;
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
        className={`group flex items-center gap-0.5 rounded-lg pr-1 transition-colors ${
          isActive
            ? "bg-brand-50/80 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
            : "hover:bg-zinc-100 dark:hover:bg-zinc-800/70"
        }`}
        style={{ paddingLeft: `${6 + depth * 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="w-4 shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Recolher" : "Expandir"}
          >
            <span className={expanded ? "inline-block rotate-90 transition-transform" : "inline-block transition-transform"}>▸</span>
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => navigate(`/pages/${page.id}`)}
          className={`flex-1 truncate py-1.5 text-left text-sm transition-colors ${
            isActive
              ? "font-medium text-brand-700 dark:text-brand-200"
              : "text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          }`}
          title={page.title}
        >
          <span className="mr-1.5">{page.icon || "📄"}</span>
          {page.title}
        </button>
        <button
          type="button"
          className={`shrink-0 rounded px-1 opacity-0 transition-opacity group-hover:opacity-100 ${
            isActive
              ? "text-brand-500 hover:text-brand-700"
              : "text-zinc-400 hover:text-brand-600"
          }`}
          title="Adicionar subpágina"
          onClick={handleAddChild}
        >
          ＋
        </button>
      </div>
      {hasChildren && expanded && page.children && (
        <ul>
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
  icon: string;
  sectionKey: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const collapsed = useUiStore((s) => s.collapsedSections[sectionKey]);
  const toggleSection = useUiStore((s) => s.toggleSection);
  return (
    <div className="mb-1.5">
      <div className="group flex items-center px-1">
        <button
          type="button"
          className="flex flex-1 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          onClick={() => toggleSection(sectionKey)}
        >
          <span
            className={
              collapsed ? "inline-block text-[10px] transition-transform" : "inline-block text-[10px] rotate-90 transition-transform"
            }
          >
            ▸
          </span>
          <span className="mr-0.5">{icon}</span>
          {title}
        </button>
        <div className="opacity-0 transition-opacity group-hover:opacity-100">{action}</div>
      </div>
      {!collapsed && <div className="mt-0.5 space-y-0.5">{children}</div>}
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

  return (
    <aside
      className={`relative flex shrink-0 flex-col border-r border-zinc-200/80 bg-white transition-all duration-200 dark:border-zinc-800 dark:bg-surface-dark ${
        collapsed ? "w-0 overflow-hidden border-r-0" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-3.5 py-3 dark:border-zinc-800">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Koda" className="h-7 w-auto" />
        </Link>
        <button
          type="button"
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          onClick={toggleSidebar}
          title="Recolher sidebar (Ctrl+\\ )"
        >
          ◀
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {activeWs && (
          <button
            type="button"
            onClick={() => navigate(`/workspaces/${activeWs.id}`)}
            className="mb-3 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800/70"
            title={activeWs.name}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-50 text-base dark:bg-brand-900/40">
              {activeWs.icon || "📁"}
            </span>
            <span className="truncate">{activeWs.name}</span>
          </button>
        )}

        {favorites.length > 0 && (
          <Section title="Favoritos" icon="⭐" sectionKey="favorites">
            {favorites.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/pages/${p.id}`)}
                className="block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/70"
                title={p.title}
              >
                {p.icon || "📄"} {p.title}
              </button>
            ))}
          </Section>
        )}

        <Section
          title="Páginas"
          icon="📄"
          sectionKey={`pages-${activeWs?.id ?? "none"}`}
          action={
            <button
              type="button"
              className="rounded-md px-1.5 py-0.5 text-zinc-400 transition-colors hover:text-brand-600"
              title="Nova página"
              onClick={handleNewPage}
            >
              ＋
            </button>
          }
        >
          {activeWs &&
            (tree.length === 0 ? (
              <p className="px-2.5 py-1 text-xs text-zinc-400">
                Nenhuma página ainda. Clique em ＋ para criar.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {tree.map((p) => (
                  <PageNode key={p.id} page={p} workspaceId={activeWs.id} depth={0} />
                ))}
              </ul>
            ))}
        </Section>

        <Section title="Workspaces" icon="📁" sectionKey="workspaces">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              to={`/workspaces/${ws.id}`}
              className={`block truncate rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                ws.id === activeWs?.id
                  ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/70"
              }`}
            >
              <span className="mr-1.5">{ws.icon || "📁"}</span>
              {ws.name}
            </Link>
          ))}
          {workspaces.length === 0 && (
            <p className="px-2.5 py-1 text-xs text-zinc-400">Nenhum workspace.</p>
          )}
        </Section>
      </nav>
    </aside>
  );
}

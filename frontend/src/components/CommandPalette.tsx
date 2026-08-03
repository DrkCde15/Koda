import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { workspaceService } from "@/services/auth";
import { pageService } from "@/services/pages";
import { searchService } from "@/services/search";
import { useThemeStore } from "@/store/themeStore";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";
import { Page, Workspace } from "@/types";

interface PaletteAction {
  id: string;
  icon: string;
  label: string;
  hint?: string;
  run: () => void;
}

interface PageHit {
  page: Page;
  workspace: Workspace;
}

interface CommandPaletteProps {
  open: boolean;
  currentWorkspaceId?: number | null;
  onClose: () => void;
}

export function CommandPalette({ open, currentWorkspaceId, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const toggleTheme = useThemeStore((s) => s.toggle);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PageHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHits([]);
    setActive(0);
    const focus = window.setTimeout(() => inputRef.current?.focus(), 30);
    workspaceService.list().then(setWorkspaces).catch(() => {});
    return () => window.clearTimeout(focus);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (!q) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const all: PageHit[] = [];
        for (const ws of workspaces) {
          const pages = await searchService.search(ws.id, q);
          pages.forEach((p) => all.push({ page: p, workspace: ws }));
        }
        setHits(all);
      } catch (err) {
        toast.push(getErrorMessage(err), "error");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  const actions: PaletteAction[] = useMemo(() => {
    const targetWs = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];
    return [
      {
        id: "new-page",
        icon: "📄",
        label: "Nova página",
        hint: targetWs ? `em "${targetWs.name}"` : undefined,
        run: async () => {
          if (!targetWs) return;
          try {
            const page = await pageService.create(targetWs.id, { title: "Sem título" });
            onClose();
            navigate(`/pages/${page.id}`);
          } catch (err) {
            toast.push(getErrorMessage(err), "error");
          }
        },
      },
      {
        id: "new-db",
        icon: "🗃️",
        label: "Novo banco de dados",
        hint: targetWs ? `em "${targetWs.name}"` : undefined,
        run: () => {
          if (!targetWs) return;
          onClose();
          navigate(`/workspaces/${targetWs.id}`);
        },
      },
      {
        id: "theme",
        icon: "🎨",
        label: "Alternar tema claro/escuro",
        run: () => {
          toggleTheme();
          onClose();
        },
      },
      {
        id: "profile",
        icon: "👤",
        label: "Ir para o perfil",
        run: () => {
          onClose();
          navigate("/profile");
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces, currentWorkspaceId]);

  const total = actions.length + hits.length;

  function select(idx: number) {
    if (idx < actions.length) actions[idx].run();
    else {
      const hit = hits[idx - actions.length];
      if (hit) {
        onClose();
        navigate(`/pages/${hit.page.id}`);
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (total ? (a + 1) % total : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (total ? (a - 1 + total) % total : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (active < total) select(active);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, total, active]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  if (!open) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/50 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-scale-in w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-soft-lg dark:border-zinc-800 dark:bg-surface-dark">
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 dark:border-zinc-800">
          <span className="text-zinc-400">
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
          </span>
          <input
            ref={inputRef}
            className="w-full bg-transparent py-3 text-sm text-zinc-900 outline-none dark:text-white"
            placeholder="Buscar páginas ou digite um comando…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              onClick={() => setQuery("")}
            >
              ✕
            </button>
          )}
          <kbd className="kbd">Esc</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-1">
          <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Ações
          </p>
          {actions.map((a, idx) => (
            <button
              key={a.id}
              type="button"
              className={`mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                idx === active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                  : "text-zinc-700 dark:text-zinc-200"
              }`}
              onMouseEnter={() => setActive(idx)}
              onClick={() => select(idx)}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-sm dark:bg-zinc-800">
                {a.icon}
              </span>
              <span className="font-medium">{a.label}</span>
              {a.hint && <span className="ml-auto text-xs text-zinc-400">{a.hint}</span>}
            </button>
          ))}

          {query.trim() && (
            <>
              <p className="px-3 py-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Páginas {searching && "…"}
              </p>
              {hits.length === 0 && !searching && (
                <p className="px-3 py-2 text-sm text-zinc-400">Nenhuma página encontrada.</p>
              )}
              {hits.map((hit, idx) => (
                <button
                  key={hit.page.id}
                  type="button"
                  className={`mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                    idx + actions.length === active
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                      : "text-zinc-700 dark:text-zinc-200"
                  }`}
                  onMouseEnter={() => setActive(idx + actions.length)}
                  onClick={() => select(idx + actions.length)}
                >
                  <span className="text-sm">{hit.page.icon || "📄"}</span>
                  <span className="truncate font-medium">{hit.page.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-zinc-400">
                    {hit.workspace.icon || "📁"} {hit.workspace.name}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

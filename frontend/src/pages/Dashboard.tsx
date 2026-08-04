import { useState } from "react";
import { useMutation, useQuery, useQueryClient, useQueries } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { workspaceService } from "@/services/auth";
import { pageService } from "@/services/pages";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";
import { useAuth } from "@/hooks/useAuth";
import { AnimatedNumber, Reveal, Skeleton } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";

function WorkspaceCard({ id, name, icon, onOpen }: { id: number; name: string; icon?: string | null; onOpen: () => void }) {
  const { data: pages = [] } = useQuery({
    queryKey: ["dashboard-pages", id],
    queryFn: () => pageService.list(id),
  });
  const { data: favorites = [] } = useQuery({
    queryKey: ["dashboard-favorites", id],
    queryFn: () => pageService.favorites(id),
  });

  return (
    <button
      type="button"
      onClick={onOpen}
      className="card card-hover group relative flex h-full w-full min-w-0 flex-col overflow-hidden p-4 text-left"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "radial-gradient(circle, rgb(93 91 239 / 0.18), transparent 65%)" }}
      />
      <div className="relative flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-500/15 bg-brand-gradient-soft text-xl transition-transform duration-300 group-hover:scale-105">
          {icon || "📁"}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--koda-surface-2)] text-[var(--koda-text-faint)] opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1">
          <Icon name="arrowUpRight" className="h-4 w-4" />
        </span>
      </div>

      <h3 className="relative mt-3 truncate text-base font-semibold tracking-tight text-[var(--koda-text)]">
        {name}
      </h3>
      <p className="relative mt-0.5 font-mono text-[10px] text-[var(--koda-text-faint)]">
        /{name.toLowerCase().replace(/\s+/g, "-").slice(0, 18)}
      </p>

      <div className="relative mt-4 flex items-center gap-2 text-xs text-[var(--koda-text-muted)]">
        <span className="chip !px-2 !py-0.5">
          <Icon name="page" className="h-3 w-3" />
          <AnimatedNumber value={pages.length} />
        </span>
        <span className="chip !px-2 !py-0.5">
          <Icon name="star" className="h-3 w-3" />
          <AnimatedNumber value={favorites.length} />
        </span>
      </div>
    </button>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [name, setName] = useState("");

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspaceService.list(),
  });

  const pageCounts = useQueries({
    queries: workspaces.map((ws) => ({
      queryKey: ["dashboard-pages", ws.id],
      queryFn: () => pageService.list(ws.id),
      enabled: workspaces.length > 0,
    })),
  });
  const favoriteCounts = useQueries({
    queries: workspaces.map((ws) => ({
      queryKey: ["dashboard-favorites", ws.id],
      queryFn: () => pageService.favorites(ws.id),
      enabled: workspaces.length > 0,
    })),
  });
  const totalPages = pageCounts.reduce((sum, q) => sum + (q.data?.length ?? 0), 0);
  const totalFavorites = favoriteCounts.reduce((sum, q) => sum + (q.data?.length ?? 0), 0);
  const isStatsLoading = pageCounts.some((q) => q.isLoading) || favoriteCounts.some((q) => q.isLoading);

  const createMutation = useMutation({
    mutationFn: (wsName: string) => workspaceService.create(wsName),
    onSuccess: (ws) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setName("");
      navigate(`/workspaces/${ws.id}`);
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const firstName = user?.full_name?.split(" ")[0] ?? "bem-vindo";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8 xl:px-10">
      {/* ---------- Hero ---------- */}
      <Reveal className="relative">
        <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <span className="chip mb-4 !border-brand-500/25 !bg-brand-500/[0.06] !text-brand-600 dark:!text-brand-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
              </span>
              {greeting}, {firstName}
            </span>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tightest sm:text-5xl lg:text-6xl">
              Seu espaço
              <br />
              <span className="text-gradient-hero">de produtividade.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--koda-text-muted)]">
              Crie workspaces, escreva páginas, organize bancos de dados e colabore com seu time — tudo com o toque premium de sempre.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <kbd className="kbd !h-6 !min-w-6"><Icon name="command" className="h-3 w-3" /> K</kbd>
            <span className="text-xs text-[var(--koda-text-faint)]">para buscar</span>
            <button type="button" onClick={() => navigate("/profile")} className="btn-ghost !py-2">
              <Icon name="settings" className="h-4 w-4" />
              Perfil
            </button>
          </div>
        </div>
      </Reveal>

      {/* ---------- Stats ---------- */}
      <Reveal delay={100}>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Workspaces",
              value: workspaces.length,
              icon: "folder" as const,
              accent: "from-brand-500/15 to-violet-500/10 text-brand-600 dark:text-brand-300",
            },
            {
              label: "Páginas",
              value: totalPages,
              icon: "page" as const,
              accent: "from-sky-500/15 to-cyan-500/10 text-sky-600 dark:text-sky-400",
            },
            {
              label: "Favoritos",
              value: totalFavorites,
              icon: "star" as const,
              accent: "from-amber-500/15 to-orange-500/10 text-amber-600 dark:text-amber-400",
            },
          ].map((stat) => (
            <div key={stat.label} className="card flex items-center gap-4 p-5">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.accent}`}>
                <Icon name={stat.icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-bold tracking-tight text-[var(--koda-text)]">
                  {isLoading || isStatsLoading ? (
                    <Skeleton className="h-7 w-10" />
                  ) : (
                    <AnimatedNumber value={stat.value} />
                  )}
                </p>
                <p className="text-xs font-medium text-[var(--koda-text-muted)]">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ---------- Quick create ---------- */}
      <Reveal delay={180}>
        <div className="card mt-10 flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--koda-text)]">Criar novo workspace</h2>
            <p className="mt-1 text-sm text-[var(--koda-text-muted)]">
              Um espaço dedicado para páginas, bancos e colaboradores.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) createMutation.mutate(name.trim());
            }}
            className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row"
          >
            <input
              className="input flex-1"
              placeholder="Nome do workspace…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Nome do novo workspace"
            />
            <button
              className="btn-primary shrink-0"
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
            >
              {createMutation.isPending ? "Criando…" : (
                <>
                  <Icon name="plus" className="h-4 w-4" />
                  Criar
                </>
              )}
            </button>
          </form>
        </div>
      </Reveal>

      {/* ---------- Workspaces grid ---------- */}
      <Reveal delay={240}>
        <div className="mt-12 mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--koda-text)]">
            Seus workspaces
          </h2>
          <span className="text-xs font-medium text-[var(--koda-text-faint)]">
            {workspaces.length} {workspaces.length === 1 ? "espaço" : "espaços"}
          </span>
        </div>
      </Reveal>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5">
              <Skeleton className="h-12 w-12" />
              <Skeleton className="mt-4 h-5 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <Skeleton className="mt-5 h-8 w-full" />
            </div>
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <Reveal>
          <div className="card flex flex-col items-center gap-3 border-dashed !border-[var(--koda-border-strong)] p-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow-brand">
              <Icon name="sparkles" className="h-6 w-6 text-white" />
            </span>
            <h3 className="text-base font-semibold text-[var(--koda-text)]">Comece agora</h3>
            <p className="max-w-sm text-sm text-[var(--koda-text-muted)]">
              Crie o primeiro workspace acima e abra um mundo de organização.
            </p>
          </div>
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {workspaces.map((ws, i) => (
            <Reveal key={ws.id} delay={i * 60}>
              <WorkspaceCard
                id={ws.id}
                name={ws.name}
                icon={ws.icon}
                onOpen={() => navigate(`/workspaces/${ws.id}`)}
              />
            </Reveal>
          ))}
        </div>
      )}

      {/* ---------- Shortcuts hint ---------- */}
      <Reveal delay={300}>
        <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { kbd: "Ctrl K", label: "Abrir busca & comandos" },
            { kbd: "Ctrl N", label: "Nova página" },
            { kbd: "Ctrl \\", label: "Recolher sidebar" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-2xl border bg-[var(--koda-surface)]/60 px-4 py-3"
              style={{ borderColor: "var(--koda-border)" }}
            >
              <kbd className="kbd">{s.kbd}</kbd>
              <span className="text-xs text-[var(--koda-text-muted)]">{s.label}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
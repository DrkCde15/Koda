import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { pageService, blockService } from "@/services/pages";
import { activityService } from "@/services/activity";
import { Block, Page } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";
import { BlockEditor } from "@/components/BlockEditor";
import { PresenceAvatars } from "@/components/PresenceAvatars";
import { Reveal, Skeleton } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";

export function PageViewPage() {
  const { id } = useParams<{ id: string }>();
  const pageId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: page, isLoading } = useQuery({
    queryKey: ["page", pageId],
    queryFn: () => pageService.get(pageId),
    staleTime: 0,
  });

  const { data: blocks, isLoading: isBlocksLoading } = useQuery({
    queryKey: ["blocks", pageId],
    queryFn: () => blockService.list(pageId),
    staleTime: 0,
  });

  const { data: presences = [] } = useQuery({
    queryKey: ["presence", page?.workspace_id],
    queryFn: () => activityService.listPresence(page!.workspace_id),
    enabled: !!page?.workspace_id,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!pageId || !user) return;
    const interval = setInterval(() => {
      activityService.setPresence(pageId);
    }, 20_000);
    activityService.setPresence(pageId);
    return () => {
      clearInterval(interval);
      activityService.setPresence(pageId, "offline").catch(() => {});
    };
  }, [pageId, user]);

  const pagePresences = presences.filter((p) => p.page_id === pageId);

  const updatePage = useMutation({
    mutationFn: (payload: Partial<Page>) => pageService.update(pageId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["page", pageId] }),
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const deletePage = useMutation({
    mutationFn: () => pageService.remove(pageId),
    onSuccess: () => {
      toast.push("Página enviada para a lixeira", "success");
      if (page?.parent_id) navigate(`/pages/${page.parent_id}`);
      else navigate(`/workspaces/${page?.workspace_id}`);
    },
  });

  if (isLoading || isBlocksLoading)
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-10 w-10" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <Skeleton className="mt-8 h-14 w-3/4" />
        <Skeleton className="mt-6 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
        <Skeleton className="mt-2 h-4 w-2/3" />
      </div>
    );
  if (!page)
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <Icon name="page" className="h-8 w-8 text-[var(--koda-text-faint)]" />
        <p className="text-sm text-[var(--koda-text-muted)]">Página não encontrada.</p>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 sm:px-10">
      {/* ---- Cover ---- */}
      {page.cover_url && (
        <Reveal className="mb-8 overflow-hidden rounded-3xl shadow-float">
          <img src={page.cover_url} alt="" className="aspect-[21/9] w-full object-cover" />
        </Reveal>
      )}

      {/* ---- Toolbar ---- */}
      <Reveal delay={40}>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              className="btn-ghost !py-2"
              title="Voltar"
              onClick={() =>
                page.parent_id
                  ? navigate(`/pages/${page.parent_id}`)
                  : navigate(`/workspaces/${page.workspace_id}`)
              }
              onMouseDown={(e) => e.preventDefault()}
            >
              <Icon name="arrowLeft" className="h-4 w-4" />
              Voltar
            </button>
            <span className="h-5 w-px bg-[var(--koda-border)]" />
            <PresenceAvatars presences={pagePresences} />
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`btn-ghost !py-2 ${page.is_favorite ? "!text-amber-500" : ""}`}
              onClick={() => updatePage.mutate({ is_favorite: !page.is_favorite })}
            >
              <Icon name="star" className={`h-4 w-4 ${page.is_favorite ? "fill-amber-500 text-amber-500" : ""}`} />
              {page.is_favorite ? "Favorito" : "Favoritar"}
            </button>
            <button
              className="btn-ghost !py-2 !text-red-500 hover:!bg-red-500/10 hover:!text-red-600"
              onClick={() => deletePage.mutate()}
            >
              <Icon name="trash" className="h-4 w-4" />
              Excluir
            </button>
          </div>
        </div>
      </Reveal>

      {/* ---- Title ---- */}
      <Reveal delay={80}>
        <div className="mb-6 flex items-start gap-4">
          <span className="mt-1 select-none text-4xl transition-transform duration-300">{page.icon || "📄"}</span>
          <input
            key={`title-${pageId}`}
            id={`page-title-${pageId}`}
            name="page-title"
            className="w-full border-none bg-transparent text-4xl font-bold leading-[1.1] tracking-tightest text-[var(--koda-text)] outline-none placeholder:text-[var(--koda-text-faint)]"
            defaultValue={page.title}
            placeholder="Sem título"
            onBlur={(e) => {
              const next = e.target.value.trim() || "Sem título";
              if (next !== e.target.value) e.target.value = next;
              if (next !== page.title) updatePage.mutate({ title: next });
            }}
          />
        </div>
      </Reveal>

      {/* ---- Editor ---- */}
      <section aria-label="Conteúdo da página">
        <BlockEditor
          key={`editor-${pageId}`}
          pageId={pageId}
          workspaceId={page.workspace_id}
          initialBlocks={(blocks as Block[]) || []}
        />
      </section>
    </div>
  );
}
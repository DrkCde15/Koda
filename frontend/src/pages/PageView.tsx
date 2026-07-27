import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { pageService, blockService, commentService } from "@/services/pages";
import { activityService } from "@/services/activity";
import { Block, Comment, Page } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";
import { BlockEditor } from "@/components/BlockEditor";
import { PresenceAvatars } from "@/components/PresenceAvatars";

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

  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ["comments", pageId],
    queryFn: () => commentService.list(pageId),
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

  const [commentBody, setCommentBody] = useState("");
  const [mentionDraft, setMentionDraft] = useState("");

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

  const createComment = useMutation({
    mutationFn: (payload: { body: string; mentions?: string[] }) => commentService.create(pageId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", pageId] });
      setCommentBody("");
      setMentionDraft("");
      toast.push("Comentário enviado", "success");
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const mentionList = useMemo(() => {
    const rawMentions = mentionDraft
      .split(/[,\n]/)
      .flatMap((item) => item.match(/@([\w\s.-]+)/g) || [])
      .map((item) => item.replace(/^@/, "").trim());
    return rawMentions.filter(Boolean);
  }, [mentionDraft]);

  if (isLoading || isBlocksLoading || isCommentsLoading) return <div className="p-8 text-gray-500 dark:text-gray-300">Carregando…</div>;
  if (!page) return <div className="p-8 text-gray-500 dark:text-gray-300">Página não encontrada.</div>;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost"
            title="Voltar"
            onClick={() =>
              page.parent_id
                ? navigate(`/pages/${page.parent_id}`)
                : navigate(`/workspaces/${page.workspace_id}`)
            }
            onMouseDown={(e) => e.preventDefault()}
          >
            ← Voltar
          </button>
          <span className="text-3xl">{page.icon || "📄"}</span>
          <PresenceAvatars presences={pagePresences} />
        </div>
        <div className="flex gap-2">
          <button
            className="btn-ghost"
            onClick={() => updatePage.mutate({ is_favorite: !page.is_favorite })}
          >
            {page.is_favorite ? "★ Favorito" : "☆ Favoritar"}
          </button>
          <button className="btn-ghost text-red-600" onClick={() => deletePage.mutate()}>
            Excluir
          </button>
        </div>
      </div>

      <input
        key={`title-${pageId}`}
        id={`page-title-${pageId}`}
        name="page-title"
        className="mb-6 w-full border-none bg-transparent text-3xl font-bold text-gray-900 outline-none dark:bg-transparent dark:text-white"
        defaultValue={page.title}
        onBlur={(e) => {
          const next = e.target.value.trim() || "Sem título";
          if (next !== e.target.value) e.target.value = next;
          if (next !== page.title) updatePage.mutate({ title: next });
        }}
      />

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-3 text-lg font-semibold">Comentários</h2>
        <textarea
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm outline-none dark:border-gray-700 dark:bg-gray-950"
          rows={3}
          placeholder="Escreva um comentário e mencione alguém com @nome"
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
        />
        <input
          className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm outline-none dark:border-gray-700 dark:bg-gray-950"
          placeholder="Mencione(s) separadas por vírgula ou escreva @nome no corpo"
          value={mentionDraft}
          onChange={(e) => setMentionDraft(e.target.value)}
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {mentionList.length > 0 ? `Mentions: ${mentionList.join(", ")}` : "Nenhuma menção ainda"}
          </p>
          <button
            className="btn-primary"
            onClick={() => createComment.mutate({ body: commentBody, mentions: mentionList })}
            disabled={createComment.isPending || !commentBody.trim()}
          >
            Enviar
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Ainda não há comentários.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950/60">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">{comment.author?.full_name || "Usuário"}</span>
                  <span className="text-xs text-gray-500">{comment.created_at?.slice(0, 10)}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200">{comment.body}</p>
                {comment.mentions?.length > 0 && (
                  <p className="mt-2 text-xs text-brand-600">Menções: {comment.mentions.join(", ")}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <BlockEditor
        key={`editor-${pageId}`}
        pageId={pageId}
        workspaceId={page.workspace_id}
        initialBlocks={(blocks as Block[]) || []}
      />
    </div>
  );
}

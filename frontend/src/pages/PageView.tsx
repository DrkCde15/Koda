import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { pageService, blockService } from "@/services/pages";
import { Block, Page } from "@/types";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";
import { BlockEditor } from "@/components/BlockEditor";

export function PageViewPage() {
  const { id } = useParams<{ id: string }>();
  const pageId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: page, isLoading } = useQuery({
    queryKey: ["page", pageId],
    queryFn: () => pageService.get(pageId),
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ["blocks", pageId],
    queryFn: () => blockService.list(pageId),
  });

  const updatePage = useMutation({
    mutationFn: (payload: Partial<Page>) => pageService.update(pageId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["page", pageId] }),
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const deletePage = useMutation({
    mutationFn: () => pageService.remove(pageId),
    onSuccess: () => {
      toast.push("Página enviada para a lixeira", "success");
      navigate(-1);
    },
  });

  if (isLoading) return <div className="p-8 text-gray-500 dark:text-gray-300">Carregando…</div>;
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
          >
            ← Voltar
          </button>
          <span className="text-3xl">{page.icon || "📄"}</span>
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
        className="mb-6 w-full border-none bg-transparent text-3xl font-bold text-gray-900 outline-none dark:bg-transparent dark:text-white"
        defaultValue={page.title}
        onBlur={(e) => {
          const next = e.target.value.trim() || "Sem título";
          if (next !== e.target.value) e.target.value = next;
          if (next !== page.title) updatePage.mutate({ title: next });
        }}
      />

      <BlockEditor
        pageId={pageId}
        workspaceId={page.workspace_id}
        initialBlocks={blocks as Block[]}
      />
    </div>
  );
}

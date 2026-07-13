import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { pageService, blockService } from "@/services/pages";
import { Page } from "@/types";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";

const BLOCK_TYPES = ["paragraph", "heading_1", "heading_2", "heading_3", "bullet_list", "quote", "code", "callout"];

export function PageViewPage() {
  const { id } = useParams<{ id: string }>();
  const pageId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [newType, setNewType] = useState("paragraph");
  const [newText, setNewText] = useState("");

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

  const addBlock = useMutation({
    mutationFn: () => blockService.create({ page_id: pageId, type: newType, content: { text: newText } }),
    onSuccess: () => {
      setNewText("");
      queryClient.invalidateQueries({ queryKey: ["blocks", pageId] });
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const removeBlock = useMutation({
    mutationFn: (blockId: number) => blockService.remove(blockId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocks", pageId] }),
  });

  if (isLoading) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!page) return <div className="p-8 text-gray-500">Página não encontrada.</div>;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-3xl">{page.icon || "📄"}</span>
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
        className="mb-6 w-full border-none text-3xl font-bold outline-none"
        defaultValue={page.title}
        onBlur={(e) => {
          if (e.target.value !== page.title) updatePage.mutate({ title: e.target.value });
        }}
      />

      <div className="space-y-2">
        {blocks.map((b) => (
          <div key={b.id} className="group flex items-start gap-2 rounded p-2 hover:bg-gray-100">
            <div className="flex-1">
              <span className="mr-2 text-xs uppercase text-gray-400">{b.type}</span>
              <span>{(b.content as { text?: string }).text || ""}</span>
            </div>
            <button
              className="text-xs text-red-500 opacity-0 group-hover:opacity-100"
              onClick={() => removeBlock.mutate(b.id)}
            >
              remover
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded border border-dashed border-gray-300 p-3">
        <p className="mb-2 text-xs uppercase text-gray-400">Adicionar bloco (estrutura do editor)</p>
        <div className="flex gap-2">
          <select className="input w-44" value={newType} onChange={(e) => setNewType(e.target.value)}>
            {BLOCK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            className="input flex-1"
            placeholder="Conteúdo do bloco"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
          />
          <button className="btn-primary" onClick={() => addBlock.mutate()} disabled={!newText.trim()}>
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

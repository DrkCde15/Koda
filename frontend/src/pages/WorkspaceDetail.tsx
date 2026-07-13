import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { workspaceService } from "@/services/auth";
import { pageService } from "@/services/pages";
import { ROLES } from "@/types";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";

type Tab = "pages" | "favorites" | "trash" | "members";

export function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const workspaceId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("pages");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("editor");

  const { data, isLoading } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => workspaceService.get(workspaceId),
  });

  const { data: pages = [] } = useQuery({
    queryKey: ["pages", workspaceId],
    queryFn: () => pageService.list(workspaceId),
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", workspaceId],
    queryFn: () => pageService.favorites(workspaceId),
  });

  const { data: trash = [] } = useQuery({
    queryKey: ["trash", workspaceId],
    queryFn: () => pageService.trash(workspaceId),
  });

  const createPage = useMutation({
    mutationFn: () => pageService.create(workspaceId, { title: "Sem título" }),
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: ["pages", workspaceId] });
      navigate(`/pages/${page.id}`);
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const invite = useMutation({
    mutationFn: () => workspaceService.createInvite(workspaceId, { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      setInviteEmail("");
      toast.push("Convite criado", "success");
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const restore = useMutation({
    mutationFn: (pageId: number) => pageService.restore(pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["pages", workspaceId] });
    },
  });

  if (isLoading) return <div className="p-8 text-gray-500">Carregando…</div>;

  const ws = data?.workspace;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          <span className="mr-2">{ws?.icon || "📁"}</span>
          {ws?.name}
        </h1>
        <button className="btn-primary" onClick={() => createPage.mutate()} disabled={createPage.isPending}>
          + Nova página
        </button>
      </div>

      <div className="mb-4 flex gap-4 border-b border-gray-200 text-sm">
        {(["pages", "favorites", "trash", "members"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? "border-b-2 border-brand-600 pb-2 font-medium" : "pb-2 text-gray-500"}
          >
            {t === "pages" ? "Páginas" : t === "favorites" ? "Favoritos" : t === "trash" ? "Lixeira" : "Membros"}
          </button>
        ))}
      </div>

      {tab === "pages" && (
        <ul className="space-y-1">
          {pages.map((p) => (
            <li key={p.id}>
              <button onClick={() => navigate(`/pages/${p.id}`)} className="w-full rounded p-2 text-left hover:bg-gray-100">
                {p.icon || "📄"} {p.title}
              </button>
            </li>
          ))}
          {pages.length === 0 && <p className="text-gray-500">Nenhuma página ainda.</p>}
        </ul>
      )}

      {tab === "favorites" && (
        <ul className="space-y-1">
          {favorites.map((p) => (
            <li key={p.id}>
              <button onClick={() => navigate(`/pages/${p.id}`)} className="w-full rounded p-2 text-left hover:bg-gray-100">
                ⭐ {p.title}
              </button>
            </li>
          ))}
          {favorites.length === 0 && <p className="text-gray-500">Nenhum favorito.</p>}
        </ul>
      )}

      {tab === "trash" && (
        <ul className="space-y-1">
          {trash.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded p-2 hover:bg-gray-100">
              <span>🗑️ {p.title}</span>
              <button className="text-sm text-brand-600 hover:underline" onClick={() => restore.mutate(p.id)}>
                Restaurar
              </button>
            </li>
          ))}
          {trash.length === 0 && <p className="text-gray-500">Lixeira vazia.</p>}
        </ul>
      )}

      {tab === "members" && (
        <div>
          <ul className="mb-4 space-y-1">
            {data?.members.map((m) => (
              <li key={m.id} className="rounded p-2 text-sm hover:bg-gray-100">
                Usuário #{m.user_id} — <span className="font-medium">{m.role}</span>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inviteEmail.trim()) invite.mutate();
            }}
            className="flex gap-2"
          >
            <input
              className="input"
              placeholder="email@exemplo.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select className="input w-40" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button className="btn-primary" type="submit" disabled={invite.isPending}>
              Convidar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { workspaceService } from "@/services/auth";
import { pageService } from "@/services/pages";
import { databaseService, TASKS_PRESET } from "@/services/databases";
import { fileService } from "@/services/files";
import { searchService } from "@/services/search";
import { activityService } from "@/services/activity";
import { Database, ROLES } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { useDialog } from "@/contexts/DialogContext";
import { getErrorMessage } from "@/utils/error";
import { ActivityFeed } from "@/components/ActivityFeed";
import { PresenceAvatars } from "@/components/PresenceAvatars";

type Tab = "pages" | "favorites" | "trash" | "databases" | "files" | "members" | "activity";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const workspaceId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const dialog = useDialog();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("pages");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("editor");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");

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

  const { data: databases = [] } = useQuery({
    queryKey: ["databases", workspaceId],
    queryFn: () => databaseService.list(workspaceId),
  });

  const { data: files = [] } = useQuery({
    queryKey: ["files", workspaceId],
    queryFn: () => fileService.list(workspaceId),
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["invites", workspaceId],
    queryFn: () => workspaceService.listInvites(workspaceId),
  });

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ["search", workspaceId, searchTerm],
    queryFn: () => searchService.search(workspaceId, searchTerm),
    enabled: searchTerm.trim().length > 0,
  });

  const { data: presences = [] } = useQuery({
    queryKey: ["presence", workspaceId],
    queryFn: () => activityService.listPresence(workspaceId),
    refetchInterval: 30_000,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activity", workspaceId],
    queryFn: () => activityService.listActivity(workspaceId),
    refetchInterval: 60_000,
  });

  const isOwner = useMemo(
    () => data?.workspace.owner_id === user?.id,
    [data, user]
  );

  const createPage = useMutation({
    mutationFn: (opts: { title?: string; icon?: string; cover_url?: string }) =>
      pageService.create(workspaceId, {
        title: opts.title || "Sem título",
        icon: opts.icon,
        cover_url: opts.cover_url,
      }),
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: ["pages", workspaceId] });
      navigate(`/pages/${page.id}`);
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const invite = useMutation({
    mutationFn: () =>
      workspaceService.createInvite(workspaceId, { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["invites", workspaceId] });
      toast.push("Convite enviado", "success");
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const revokeInvite = useMutation({
    mutationFn: (inviteId: number) => workspaceService.deleteInvite(workspaceId, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites", workspaceId] });
      toast.push("Convite revogado", "success");
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const changeRole = useMutation({
    mutationFn: (vars: { userId: number; role: string }) =>
      workspaceService.changeMemberRole(workspaceId, vars.userId, vars.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      toast.push("Função atualizada", "success");
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const removeMember = useMutation({
    mutationFn: (userId: number) => workspaceService.removeMember(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      toast.push("Membro removido", "success");
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

  const updateWorkspace = useMutation({
    mutationFn: (payload: { name?: string; icon?: string }) =>
      workspaceService.update(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.push("Workspace atualizado", "success");
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const deleteWorkspace = useMutation({
    mutationFn: () => workspaceService.remove(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      navigate("/");
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const uploadFile = useMutation({
    mutationFn: (file: File) => fileService.upload(workspaceId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", workspaceId] });
      toast.push("Arquivo enviado", "success");
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const downloadFile = useMutation({
    mutationFn: (f: { filename: string; original_name: string }) =>
      fileService.download(workspaceId, f.filename, f.original_name),
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const removeFile = useMutation({
    mutationFn: (fileId: number) => fileService.remove(workspaceId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", workspaceId] });
      toast.push("Arquivo removido", "success");
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const createDatabase = useMutation({
    mutationFn: async (name: string) =>
      databaseService.create({ workspace_id: workspaceId, name, icon: "🗃️" }),
    onSuccess: (db: Database) => {
      queryClient.invalidateQueries({ queryKey: ["databases", workspaceId] });
      navigate(`/workspaces/${workspaceId}/databases/${db.id}`);
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  const createTasks = useMutation({
    mutationFn: async () =>
      databaseService.create({ ...TASKS_PRESET, workspace_id: workspaceId }),
    onSuccess: (db: Database) => {
      queryClient.invalidateQueries({ queryKey: ["databases", workspaceId] });
      navigate(`/workspaces/${workspaceId}/databases/${db.id}`);
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  if (isLoading) return <div className="p-8 text-gray-500 dark:text-gray-300">Carregando…</div>;

  const ws = data?.workspace;

  async function handleNewPage() {
    const result = await dialog.prompt({
      title: "Nova página",
      confirmLabel: "Criar",
      fields: [
        { name: "title", label: "Nome da página", defaultValue: "Sem título", required: true },
        { name: "icon", label: "Ícone (emoji, opcional)", defaultValue: "📄" },
        { name: "cover", label: "URL da capa (opcional)", placeholder: "https://…" },
      ],
    });
    if (!result) return;
    createPage.mutate({
      title: result.title.trim() || "Sem título",
      icon: result.icon || undefined,
      cover_url: result.cover?.trim() || undefined,
    });
  }

  async function handleRenameWorkspace() {
    const result = await dialog.prompt({
      title: "Editar workspace",
      confirmLabel: "Salvar",
      fields: [
        { name: "name", label: "Nome", defaultValue: ws?.name || "", required: true },
        { name: "icon", label: "Ícone (emoji)", defaultValue: ws?.icon || "📁" },
      ],
    });
    if (!result) return;
    updateWorkspace.mutate({ name: result.name, icon: result.icon || undefined });
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            <span className="mr-2">{ws?.icon || "📁"}</span>
            {ws?.name}
          </h1>
          <PresenceAvatars presences={presences} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={handleNewPage} disabled={createPage.isPending}>
            + Nova página
          </button>
          <button className="btn-ghost" onClick={handleRenameWorkspace}>
            ✏️ Editar
          </button>
          {isOwner && (
            <button
              className="btn-ghost text-red-500 hover:text-red-600"
              onClick={async () => {
                const ok = await dialog.confirm({
                  title: "Excluir workspace",
                  message: "Excluir este workspace? Tudo será removido.",
                  confirmLabel: "Excluir",
                  danger: true,
                });
                if (ok) deleteWorkspace.mutate();
              }}
              disabled={deleteWorkspace.isPending}
            >
              🗑 Excluir
            </button>
          )}
        </div>
      </div>

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearchTerm(searchInput.trim());
        }}
      >
        <input
          id="search-pages"
          name="search-pages"
          className="input"
          placeholder="Buscar páginas…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button className="btn-ghost" type="submit">
          🔍 Buscar
        </button>
        {searchTerm && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setSearchTerm("");
              setSearchInput("");
            }}
          >
            Limpar
          </button>
        )}
      </form>

      {searchTerm ? (
        <div>
          <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-300">
            Resultados para "{searchTerm}" {searching && "…"}
          </h2>
          <ul className="space-y-1">
            {searchResults.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => navigate(`/pages/${p.id}`)}
                  className="w-full rounded p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {p.icon || "📄"} {p.title}
                </button>
              </li>
            ))}
            {!searching && searchResults.length === 0 && (
              <p className="text-gray-500 dark:text-gray-300">Nenhum resultado.</p>
            )}
          </ul>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-4 border-b border-gray-200 text-sm dark:border-gray-700">
            {(["pages", "favorites", "trash", "databases", "files", "members", "activity"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={
                  tab === t
                    ? "border-b-2 border-brand-600 pb-2 font-medium"
                    : "pb-2 text-gray-500 dark:text-gray-300"
                }
              >
                {t === "pages"
                  ? "Páginas"
                  : t === "favorites"
                  ? "Favoritos"
                  : t === "trash"
                  ? "Lixeira"
                  : t === "databases"
                  ? "Bancos"
                  : t === "files"
                  ? "Arquivos"
                  : t === "activity"
                  ? "Atividade"
                  : "Membros"}
              </button>
            ))}
          </div>

          {tab === "pages" && (
            <ul className="space-y-1">
              {pages.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => navigate(`/pages/${p.id}`)}
                    className="w-full rounded p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {p.icon || "📄"} {p.title}
                  </button>
                </li>
              ))}
              {pages.length === 0 && (
                <p className="text-gray-500 dark:text-gray-300">Nenhuma página ainda.</p>
              )}
            </ul>
          )}

          {tab === "favorites" && (
            <ul className="space-y-1">
              {favorites.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => navigate(`/pages/${p.id}`)}
                    className="w-full rounded p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    ⭐ {p.title}
                  </button>
                </li>
              ))}
              {favorites.length === 0 && (
                <p className="text-gray-500 dark:text-gray-300">Nenhum favorito.</p>
              )}
            </ul>
          )}

          {tab === "trash" && (
            <ul className="space-y-1">
              {trash.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <span>🗑️ {p.title}</span>
                  <button
                    className="text-sm text-brand-600 hover:underline"
                    onClick={() => restore.mutate(p.id)}
                  >
                    Restaurar
                  </button>
                </li>
              ))}
              {trash.length === 0 && (
                <p className="text-gray-500 dark:text-gray-300">Lixeira vazia.</p>
              )}
            </ul>
          )}

          {tab === "databases" && (
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  className="btn-primary"
                  onClick={async () => {
                    const result = await dialog.prompt({
                      title: "Novo banco de dados",
                      confirmLabel: "Criar",
                      fields: [
                        {
                          name: "name",
                          label: "Nome do banco",
                          defaultValue: "Novo banco",
                          required: true,
                        },
                      ],
                    });
                    if (result?.name) createDatabase.mutate(result.name);
                  }}
                  disabled={createDatabase.isPending}
                >
                  + Novo banco
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => createTasks.mutate()}
                  disabled={createTasks.isPending}
                >
                  ✅ Banco de Tarefas
                </button>
              </div>
              <ul className="space-y-1">
                {databases.map((db) => (
                  <li key={db.id}>
                    <button
                      onClick={() => navigate(`/workspaces/${workspaceId}/databases/${db.id}`)}
                      className="w-full rounded p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {db.icon || "🗃️"} {db.name}{" "}
                      <span className="text-xs text-gray-400">
                        ({db.properties.length} propriedades · {(db.items || []).length} itens)
                      </span>
                    </button>
                  </li>
                ))}
                {databases.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-300">Nenhum banco de dados ainda.</p>
                )}
              </ul>
            </div>
          )}

          {tab === "files" && (
            <div>
              <label className="btn-primary mb-4 inline-block cursor-pointer">
                {uploadFile.isPending ? "Enviando…" : "⬆️ Enviar arquivo"}
                <input
                  type="file"
                  className="hidden"
                  disabled={uploadFile.isPending}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadFile.mutate(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <ul className="space-y-1">
                {files.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <button
                      onClick={() =>
                        downloadFile.mutate({
                          filename: f.filename,
                          original_name: f.original_name,
                        })
                      }
                      disabled={downloadFile.isPending}
                      className="truncate text-left text-brand-600 hover:underline"
                    >
                      📎 {f.original_name}{" "}
                      <span className="text-xs text-gray-400">({formatSize(f.size)})</span>
                    </button>
                    <button
                      className="text-gray-400 hover:text-red-500"
                      onClick={() => removeFile.mutate(f.id)}
                    >
                      🗑
                    </button>
                  </li>
                ))}
                {files.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-300">Nenhum arquivo.</p>
                )}
              </ul>
            </div>
          )}

          {tab === "members" && (
            <div>
              <ul className="mb-6 space-y-1">
                {data?.members.map((m) => {
                  const owner = m.role === "owner";
                  return (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <span>
                        {m.user?.full_name || `Usuário #${m.user_id}`}
                        {m.user?.email && (
                          <span className="ml-2 text-xs text-gray-400">{m.user.email}</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          className="input w-32"
                          value={m.role}
                          disabled={owner || changeRole.isPending}
                          onChange={(e) =>
                            changeRole.mutate({ userId: m.user_id, role: e.target.value })
                          }
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        {!owner && (
                          <button
                            className="text-gray-400 hover:text-red-500"
                            title="Remover membro"
                            onClick={async () => {
                              const ok = await dialog.confirm({
                                title: "Remover membro",
                                message: "Remover este membro do workspace?",
                                confirmLabel: "Remover",
                                danger: true,
                              });
                              if (ok) removeMember.mutate(m.user_id);
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <h3 className="mb-2 text-sm font-medium">Convidar por email</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inviteEmail.trim()) invite.mutate();
                }}
                className="mb-6 flex flex-wrap gap-2"
              >
                <input
                  id="invite-email"
                  name="invite-email"
                  type="email"
                  autoComplete="email"
                  className="input"
                  placeholder="email@exemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <select
                  className="input w-40"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  {ROLES.filter((r) => r !== "owner").map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button className="btn-primary" type="submit" disabled={invite.isPending}>
                  Convidar
                </button>
              </form>

              {invites.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Convites pendentes</h3>
                  <ul className="space-y-1">
                    {invites
                      .filter((i) => !i.accepted)
                      .map((i) => (
                        <li
                          key={i.id}
                          className="flex items-center justify-between rounded p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <span>
                            {i.email} — <span className="text-gray-400">{i.role}</span>
                          </span>
                          <button
                            className="text-sm text-red-500 hover:underline"
                            onClick={() => revokeInvite.mutate(i.id)}
                          >
                            Revogar
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {tab === "activity" && (
            <div>
              <h2 className="mb-4 text-sm font-medium text-gray-500 dark:text-gray-300">
                Atividade recente do workspace
              </h2>
              <ActivityFeed activities={activities} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

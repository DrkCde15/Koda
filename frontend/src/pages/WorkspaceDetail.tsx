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
import { Reveal, Skeleton } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";

type Tab = "pages" | "favorites" | "trash" | "databases" | "files" | "members" | "activity";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "pages", label: "Páginas", icon: <Icon name="file" className="h-3.5 w-3.5" /> },
  { key: "favorites", label: "Favoritos", icon: <Icon name="star" className="h-3.5 w-3.5" /> },
  { key: "trash", label: "Lixeira", icon: <Icon name="trash" className="h-3.5 w-3.5" /> },
  { key: "databases", label: "Bancos", icon: <Icon name="database" className="h-3.5 w-3.5" /> },
  { key: "files", label: "Arquivos", icon: <Icon name="upload" className="h-3.5 w-3.5" /> },
  { key: "members", label: "Membros", icon: <Icon name="users" className="h-3.5 w-3.5" /> },
  { key: "activity", label: "Atividade", icon: <Icon name="activity" className="h-3.5 w-3.5" /> },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ListRow({
  icon,
  title,
  subtitle,
  onClick,
  trailing,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className="group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-150 last:rounded-b-2xl hover:bg-[var(--koda-surface-2)]/70"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--koda-surface-2)] text-sm transition-transform duration-200 group-hover:scale-105">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--koda-text)]">{title}</span>
        {subtitle && (
          <span className="block truncate text-xs text-[var(--koda-text-muted)]">{subtitle}</span>
        )}
      </span>
      {trailing ?? (
        <Icon
          name="chevronRight"
          className="h-4 w-4 shrink-0 text-[var(--koda-text-faint)] opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
        />
      )}
    </div>
  );
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

  if (isLoading)
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14" />
          <div className="flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        </div>
        <Skeleton className="mt-8 h-12 w-full" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );

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

  const emptyState = (icon: React.ReactNode, title: string, hint: string) => (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--koda-surface-2)] text-xl">
        {icon}
      </span>
      <p className="text-sm font-semibold text-[var(--koda-text)]">{title}</p>
      <p className="max-w-xs text-xs text-[var(--koda-text-muted)]">{hint}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      {/* ---------- Header ---------- */}
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-gradient-soft text-3xl shadow-soft-sm">
              <span aria-hidden className="absolute -inset-px rounded-2xl bg-brand-gradient opacity-0 transition-opacity duration-300 hover:opacity-10" />
              {ws?.icon || "📁"}
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tightest sm:text-3xl">{ws?.name}</h1>
              <div className="mt-1 flex items-center gap-2">
                {ws?.slug && <span className="font-mono text-xs text-[var(--koda-text-faint)]">/{ws.slug}</span>}
                <PresenceAvatars presences={presences} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={handleNewPage} disabled={createPage.isPending}>
              <Icon name="plus" className="h-4 w-4" />
              Nova página
            </button>
            <button className="btn-secondary" onClick={handleRenameWorkspace}>
              <Icon name="edit" className="h-4 w-4" />
              Editar
            </button>
            {isOwner && (
              <button
                className="btn-ghost !text-red-500 hover:!bg-red-500/10 hover:!text-red-600"
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
                <Icon name="trash" className="h-4 w-4" />
                Excluir
              </button>
            )}
          </div>
        </div>
      </Reveal>

      {/* ---------- Search ---------- */}
      <Reveal delay={80}>
        <form
          className="relative mt-8"
          onSubmit={(e) => {
            e.preventDefault();
            setSearchTerm(searchInput.trim());
          }}
        >
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[var(--koda-text-faint)]">
            <Icon name="search" className="h-4 w-4" />
          </span>
          <input
            id="search-pages"
            name="search-pages"
            className="input !rounded-2xl !py-3 pl-11 pr-28"
            placeholder="Buscar páginas neste workspace…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <div className="absolute inset-y-1.5 right-1.5 flex gap-1">
            {searchInput && (
              <button
                type="button"
                className="rounded-xl px-3 text-xs font-semibold text-[var(--koda-text-muted)] transition-colors hover:bg-[var(--koda-surface-2)]"
                onClick={() => {
                  setSearchTerm("");
                  setSearchInput("");
                }}
              >
                Limpar
              </button>
            )}
            <button type="submit" className="btn-primary !h-auto !py-2">
              <Icon name="search" className="h-3.5 w-3.5" />
              Buscar
            </button>
          </div>
        </form>
      </Reveal>

      {/* ---------- Tabs ---------- */}
      <Reveal delay={140}>
        <div className="mt-8 flex gap-1 overflow-x-auto rounded-2xl border bg-[var(--koda-surface)] p-1.5 shadow-soft-sm"
          style={{ borderColor: "var(--koda-border)" }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                tab === t.key
                  ? "text-[var(--koda-text)]"
                  : "text-[var(--koda-text-muted)] hover:text-[var(--koda-text)]"
              }`}
            >
              {tab === t.key && (
                <span className="absolute inset-0 rounded-xl bg-brand-gradient-soft border border-brand-500/25" />
              )}
              <span className="relative">{t.icon}</span>
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
      </Reveal>

      {/* ---------- Content ---------- */}
      <Reveal delay={200}>
        <div className="card mt-5 overflow-hidden !p-0">
          {searchTerm ? (
            <div className="p-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--koda-text-faint)]">
                Resultados para "{searchTerm}" {searching && <span className="animate-pulse-soft">…</span>}
              </h2>
              <div className="divide-y divide-[var(--koda-border)]">
                {searchResults.map((p) => (
                  <ListRow
                    key={p.id}
                    icon={p.icon || "📄"}
                    title={p.title}
                    onClick={() => navigate(`/pages/${p.id}`)}
                  />
                ))}
                {!searching && searchResults.length === 0 && (
                  <p className="py-8 text-center text-sm text-[var(--koda-text-muted)]">Nenhum resultado.</p>
                )}
              </div>
            </div>
          ) : (
            <>
              {tab === "pages" && (
                <div className="divide-y divide-[var(--koda-border)]">
                  {pages.map((p) => (
                    <ListRow
                      key={p.id}
                      icon={p.icon || "📄"}
                      title={p.title}
                      subtitle={`atualizada ${p.updated_at ? new Date(p.updated_at).toLocaleDateString("pt-BR") : "—"}`}
                      onClick={() => navigate(`/pages/${p.id}`)}
                    />
                  ))}
                  {pages.length === 0 && emptyState("📄", "Nenhuma página ainda", "Clique em “Nova página” para criar a primeira.")}
                </div>
              )}

              {tab === "favorites" && (
                <div className="divide-y divide-[var(--koda-border)]">
                  {favorites.map((p) => (
                    <ListRow
                      key={p.id}
                      icon={<Icon name="star" className="h-4 w-4 text-amber-500" />}
                      title={p.title}
                      onClick={() => navigate(`/pages/${p.id}`)}
                    />
                  ))}
                  {favorites.length === 0 && emptyState(<Icon name="star" className="h-5 w-5 text-[var(--koda-text-muted)]" />, "Nenhum favorito", "Marque páginas como favoritas para vê-las aqui.")}
                </div>
              )}

              {tab === "trash" && (
                <div className="divide-y divide-[var(--koda-border)]">
                  {trash.map((p) => (
                    <div key={p.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--koda-surface-2)]/70">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                        <Icon name="trash" className="h-4 w-4" />
                      </span>
                      <span className="flex-1 truncate text-sm font-medium text-[var(--koda-text)]">{p.title}</span>
                      <button
                        className="btn-ghost !py-1.5 text-xs"
                        onClick={() => restore.mutate(p.id)}
                      >
                        <Icon name="refresh" className="h-3.5 w-3.5" />
                        Restaurar
                      </button>
                    </div>
                  ))}
                  {trash.length === 0 && emptyState(<Icon name="trash" className="h-5 w-5 text-[var(--koda-text-muted)]" />, "Lixeira vazia", "Páginas excluídas aparecem aqui por um tempo.")}
                </div>
              )}

              {tab === "databases" && (
                <div>
                  <div className="flex flex-wrap gap-2 border-b px-5 py-4" style={{ borderColor: "var(--koda-border)" }}>
                    <button
                      className="btn-primary"
                      onClick={async () => {
                        const result = await dialog.prompt({
                          title: "Novo banco de dados",
                          confirmLabel: "Criar",
                          fields: [
                            { name: "name", label: "Nome do banco", defaultValue: "Novo banco", required: true },
                          ],
                        });
                        if (result?.name) createDatabase.mutate(result.name);
                      }}
                      disabled={createDatabase.isPending}
                    >
                      <Icon name="plus" className="h-4 w-4" />
                      Novo banco
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => createTasks.mutate()}
                      disabled={createTasks.isPending}
                    >
                      ✅ Banco de Tarefas
                    </button>
                  </div>
                  <div className="divide-y divide-[var(--koda-border)]">
                    {databases.map((db) => (
                      <ListRow
                        key={db.id}
                        icon={db.icon || "🗃️"}
                        title={db.name}
                        subtitle={`${db.properties.length} propriedades · ${(db.items || []).length} itens`}
                        onClick={() => navigate(`/workspaces/${workspaceId}/databases/${db.id}`)}
                      />
                    ))}
                    {databases.length === 0 && emptyState("🗃️", "Nenhum banco de dados", "Crie um banco para estruturar suas informações.")}
                  </div>
                </div>
              )}

              {tab === "files" && (
                <div>
                  <div className="border-b px-5 py-4" style={{ borderColor: "var(--koda-border)" }}>
                    <label className="btn-secondary cursor-pointer">
                      {uploadFile.isPending ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                          Enviando…
                        </>
                      ) : (
                        <>
                          <Icon name="upload" className="h-4 w-4" />
                          Enviar arquivo
                        </>
                      )}
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
                  </div>
                  <div className="divide-y divide-[var(--koda-border)]">
                    {files.map((f) => (
                      <div key={f.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--koda-surface-2)]/70">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--koda-surface-2)] text-[var(--koda-text-muted)]">
                          <Icon name="file" className="h-4 w-4" />
                        </span>
                        <button
                          onClick={() =>
                            downloadFile.mutate({ filename: f.filename, original_name: f.original_name })
                          }
                          disabled={downloadFile.isPending}
                          className="min-w-0 flex-1 truncate text-left text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-300"
                        >
                          {f.original_name}
                          <span className="ml-2 text-xs font-normal text-[var(--koda-text-faint)]">
                            {formatSize(f.size)}
                          </span>
                        </button>
                        <button
                          className="btn-icon h-8 w-8 hover:!text-red-500"
                          title="Excluir arquivo"
                          onClick={() => removeFile.mutate(f.id)}
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {files.length === 0 && emptyState(<Icon name="file" className="h-5 w-5 text-[var(--koda-text-muted)]" />, "Nenhum arquivo", "Envie arquivos para compartilhar com o time.")}
                  </div>
                </div>
              )}

              {tab === "members" && (
                <div className="p-5">
                  <h3 className="field-muted mb-3">Membros</h3>
                  <div className="divide-y divide-[var(--koda-border)] rounded-2xl border" style={{ borderColor: "var(--koda-border)" }}>
                    {data?.members.map((m) => {
                      const owner = m.role === "owner";
                      return (
                        <div
                          key={m.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-gradient text-xs font-bold text-white shadow-glow-brand">
                              {(m.user?.full_name || "?").charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[var(--koda-text)]">
                                {m.user?.full_name || `Usuário #${m.user_id}`}
                                {owner && (
                                  <span className="badge ml-2 !bg-brand-500/10 !text-brand-600 dark:!text-brand-300">
                                    dono
                                  </span>
                                )}
                              </p>
                              {m.user?.email && (
                                <p className="truncate text-xs text-[var(--koda-text-muted)]">{m.user.email}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              className="input !w-32 !py-1.5"
                              value={m.role}
                              disabled={owner || changeRole.isPending}
                              onChange={(e) => changeRole.mutate({ userId: m.user_id, role: e.target.value })}
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                            {!owner && (
                              <button
                                className="btn-icon h-8 w-8 hover:!text-red-500"
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
                                <Icon name="x" className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <h3 className="field-muted mt-6 mb-3">Convidar por email</h3>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (inviteEmail.trim()) invite.mutate();
                    }}
                    className="flex flex-wrap gap-2"
                  >
                    <input
                      id="invite-email"
                      name="invite-email"
                      type="email"
                      autoComplete="email"
                      className="input flex-1 min-w-52"
                      placeholder="email@exemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <select
                      className="input w-36"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                    >
                      {ROLES.filter((r) => r !== "owner").map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button className="btn-primary" type="submit" disabled={invite.isPending}>
                      <Icon name="users" className="h-4 w-4" />
                      Convidar
                    </button>
                  </form>

                  {invites.length > 0 && (
                    <div className="mt-6">
                      <h3 className="field-muted mb-3">Convites pendentes</h3>
                      <div className="divide-y divide-[var(--koda-border)] rounded-2xl border" style={{ borderColor: "var(--koda-border)" }}>
                        {invites.filter((i) => !i.accepted).map((i) => (
                          <div key={i.id} className="flex items-center justify-between px-4 py-3">
                            <span className="text-sm">
                              {i.email}
                              <span className="badge ml-2">{i.role}</span>
                            </span>
                            <button
                              className="btn-ghost !py-1.5 text-xs !text-red-500 hover:!bg-red-500/10"
                              onClick={() => revokeInvite.mutate(i.id)}
                            >
                              Revogar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "activity" && (
                <div className="p-5">
                  <h2 className="field-muted mb-4">Atividade recente do workspace</h2>
                  <ActivityFeed activities={activities} />
                </div>
              )}
            </>
          )}
        </div>
      </Reveal>
    </div>
  );
}
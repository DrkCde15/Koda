import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { workspaceService } from "@/services/auth";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";

export function DashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspaceService.list(),
  });

  const createMutation = useMutation({
    mutationFn: (wsName: string) => workspaceService.create(wsName),
    onSuccess: (ws) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setName("");
      navigate(`/workspaces/${ws.id}`);
    },
    onError: (err) => toast.push(getErrorMessage(err), "error"),
  });

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Seus Workspaces</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Crie um espaço para organizar páginas, bancos de dados e seu time.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) createMutation.mutate(name.trim());
        }}
        className="mb-8 flex gap-2"
      >
        <input
          className="input max-w-sm"
          placeholder="Nome do novo workspace"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn-primary" type="submit" disabled={createMutation.isPending}>
          ＋ Criar
        </button>
      </form>

      {isLoading ? (
        <p className="text-sm text-zinc-500">Carregando…</p>
      ) : workspaces.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nenhum workspace ainda. Crie o primeiro acima.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => navigate(`/workspaces/${ws.id}`)}
              className="card group text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft dark:hover:border-brand-500/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-xl dark:bg-brand-900/40">
                {ws.icon || "📁"}
              </div>
              <div className="mt-3 font-semibold tracking-tight text-zinc-900 group-hover:text-brand-700 dark:text-zinc-100 dark:group-hover:text-brand-300">
                {ws.name}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
      <h1 className="mb-6 text-2xl font-bold">Seus Workspaces</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) createMutation.mutate(name.trim());
        }}
        className="mb-8 flex gap-2"
      >
        <input
          className="input"
          placeholder="Nome do novo workspace"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn-primary" type="submit" disabled={createMutation.isPending}>
          Criar
        </button>
      </form>

      {isLoading ? (
        <p className="text-gray-500">Carregando…</p>
      ) : workspaces.length === 0 ? (
        <p className="text-gray-500">Nenhum workspace ainda. Crie o primeiro acima.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => navigate(`/workspaces/${ws.id}`)}
              className="card text-left hover:border-brand-400"
            >
              <div className="text-2xl">{ws.icon || "📁"}</div>
              <div className="mt-2 font-medium">{ws.name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

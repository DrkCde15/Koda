import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { databaseService } from "@/services/databases";
import { Database, DatabaseItem, DatabaseProperty, PropertyType } from "@/types";

function toDateInput(value: string | number | null): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const PROPERTY_TYPES: PropertyType[] = ["text", "number", "select", "date", "status"];

export default function DatabaseView() {
  const { workspaceId, databaseId } = useParams<{
    workspaceId: string;
    databaseId: string;
  }>();
  const navigate = useNavigate();
  const [db, setDb] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await databaseService.get(Number(databaseId));
      setDb(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erro ao carregar o banco de dados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseId]);

  async function saveCell(item: DatabaseItem, prop: DatabaseProperty, value: string | number | null) {
    setBusy(true);
    try {
      const updated = await databaseService.updateItem(Number(databaseId), item.id, [
        { property_id: prop.id, value },
      ]);
      setDb((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: (prev.items || []).map((it) =>
            it.id === updated.id ? updated : it
          ),
        };
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    setBusy(true);
    try {
      const created = await databaseService.addItem(Number(databaseId), [], (db?.items?.length || 0) + 1);
      setDb((prev) =>
        prev ? { ...prev, items: [...(prev.items || []), created] } : prev
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erro ao adicionar item");
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(itemId: number) {
    setBusy(true);
    try {
      await databaseService.removeItem(Number(databaseId), itemId);
      setDb((prev) =>
        prev ? { ...prev, items: (prev.items || []).filter((i) => i.id !== itemId) } : prev
      );
    } finally {
      setBusy(false);
    }
  }

  async function addProperty() {
    const name = window.prompt("Nome da propriedade:");
    if (!name) return;
    const type = window.prompt(
      `Tipo (${PROPERTY_TYPES.join(", ")}):`,
      "text"
    ) as PropertyType | null;
    if (!type || !PROPERTY_TYPES.includes(type)) return;
    let options: { choices?: string[] } | undefined;
    if (type === "select" || type === "status") {
      const raw = window.prompt("Opções (separadas por vírgula):", "");
      if (raw) options = { choices: raw.split(",").map((s) => s.trim()).filter(Boolean) };
    }
    setBusy(true);
    try {
      const prop = await databaseService.addProperty(Number(databaseId), {
        name,
        type,
        options,
        position: (db?.properties.length || 0) + 1,
      });
      setDb((prev) => (prev ? { ...prev, properties: [...prev.properties, prop] } : prev));
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erro ao adicionar propriedade");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProperty(prop: DatabaseProperty) {
    if (!window.confirm(`Remover a propriedade "${prop.name}"?`)) return;
    setBusy(true);
    try {
      await databaseService.removeProperty(Number(databaseId), prop.id);
      setDb((prev) =>
        prev
          ? {
              ...prev,
              properties: prev.properties.filter((p) => p.id !== prop.id),
              items: (prev.items || []).map((it) => {
                const rest = { ...it.values };
                delete rest[String(prop.id)];
                return { ...it, values: rest };
              }),
            }
          : prev
      );
    } finally {
      setBusy(false);
    }
  }

  async function renameDatabase() {
    const name = window.prompt("Renomear banco de dados:", db?.name || "");
    if (!name) return;
    const icon = window.prompt("Ícone (emoji):", db?.icon || "");
    setBusy(true);
    try {
      const updated = await databaseService.update(Number(databaseId), {
        name,
        icon: icon || undefined,
      });
      setDb(updated);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erro ao renomear");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDatabase() {
    if (!window.confirm("Excluir este banco de dados? Itens e propriedades serão removidos."))
      return;
    setBusy(true);
    try {
      await databaseService.remove(Number(databaseId));
      navigate(`/workspaces/${workspaceId}`);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erro ao excluir");
    } finally {
      setBusy(false);
    }
  }

  async function editProperty(prop: DatabaseProperty) {
    const name = window.prompt("Renomear propriedade:", prop.name);
    if (!name) return;
    let options: { choices?: string[] } | undefined;
    if (prop.type === "select" || prop.type === "status") {
      const raw = window.prompt(
        "Opções (separadas por vírgula):",
        (prop.options?.choices || []).join(", ")
      );
      if (raw !== null)
        options = { choices: raw.split(",").map((s) => s.trim()).filter(Boolean) };
    }
    setBusy(true);
    try {
      const updated = await databaseService.updateProperty(Number(databaseId), prop.id, {
        name,
        options,
      });
      setDb((prev) =>
        prev
          ? {
              ...prev,
              properties: prev.properties.map((p) => (p.id === updated.id ? updated : p)),
            }
          : prev
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erro ao editar propriedade");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-6">Carregando…</div>;
  if (error && !db) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <button
        className="btn-ghost mb-4"
        onClick={() => navigate(`/workspaces/${workspaceId}`)}
      >
        ← Voltar ao workspace
      </button>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {db?.icon && <span className="text-2xl">{db.icon}</span>}
          <h1 className="text-xl font-semibold">{db?.name}</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={renameDatabase} disabled={busy}>
            ✏️ Renomear
          </button>
          <button
            className="btn-ghost text-red-500 hover:text-red-600"
            onClick={deleteDatabase}
            disabled={busy}
          >
            🗑 Excluir
          </button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left p-2 w-10">#</th>
              {db?.properties.map((prop) => (
                <th key={prop.id} className="text-left p-2 min-w-[160px]">
                  <div className="flex items-center gap-2">
                    <span>{prop.name}</span>
                    <span className="text-xs text-gray-400">({prop.type})</span>
                    <button
                      className="text-gray-400 hover:text-brand-600"
                      title="Editar propriedade"
                      onClick={() => editProperty(prop)}
                    >
                      ✎
                    </button>
                    <button
                      className="text-gray-400 hover:text-red-500"
                      title="Remover propriedade"
                      onClick={() => deleteProperty(prop)}
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
              <th className="p-2">
                <button className="btn-ghost" onClick={addProperty} disabled={busy}>
                  + Propriedade
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {(db?.items || []).map((item, idx) => (
              <tr
                key={item.id}
                className="border-b border-gray-100 dark:border-gray-800"
              >
                <td className="p-2 text-gray-400">{idx + 1}</td>
                {db?.properties.map((prop) => {
                  const cell = item.values[String(prop.id)];
                  const value = cell?.value ?? null;
                  const isSelect = prop.type === "select" || prop.type === "status";
                  return (
                    <td key={prop.id} className="p-2">
                      {isSelect ? (
                        <select
                          className="input"
                          value={(value as string) || ""}
                          onChange={(e) =>
                            saveCell(item, prop, e.target.value || null)
                          }
                          disabled={busy}
                        >
                          <option value="">—</option>
                          {(prop.options?.choices || []).map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      ) : prop.type === "date" ? (
                        <input
                          type="date"
                          className="input"
                          value={toDateInput(value)}
                          onChange={(e) =>
                            saveCell(item, prop, e.target.value || null)
                          }
                          disabled={busy}
                        />
                      ) : prop.type === "number" ? (
                        <input
                          type="number"
                          className="input"
                          value={value === null || value === undefined ? "" : String(value)}
                          onChange={(e) =>
                            saveCell(
                              item,
                              prop,
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                          disabled={busy}
                        />
                      ) : (
                        <input
                          className="input"
                          value={(value as string) || ""}
                          onChange={(e) =>
                            saveCell(item, prop, e.target.value || null)
                          }
                          disabled={busy}
                        />
                      )}
                    </td>
                  );
                })}
                <td className="p-2">
                  <button
                    className="text-gray-400 hover:text-red-500"
                    onClick={() => deleteItem(item.id)}
                    disabled={busy}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3">
          <button className="btn-ghost" onClick={addItem} disabled={busy}>
            + Adicionar item
          </button>
        </div>
      </div>
    </div>
  );
}

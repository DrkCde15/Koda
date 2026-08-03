import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { databaseService } from "@/services/databases";
import {
  Database,
  DatabaseItem,
  DatabaseProperty,
  DatabaseViewMode,
  FilterOperator,
  FilterRule,
  PropertyType,
  SortDirection,
  SortRule,
} from "@/types";
import { useDialog } from "@/contexts/DialogContext";
import { CellEditor, getItemValue } from "@/components/DatabaseCells";
import { KanbanBoard } from "@/components/KanbanBoard";
import { RowDetailModal } from "@/components/RowDetailModal";

const PROPERTY_TYPES: PropertyType[] = ["text", "number", "select", "date", "status"];

interface OperatorOption {
  value: FilterOperator;
  label: string;
}

const OPERATORS_BY_TYPE: Record<PropertyType, OperatorOption[]> = {
  text: [
    { value: "contains", label: "contém" },
    { value: "equals", label: "é igual a" },
    { value: "is_empty", label: "está vazio" },
    { value: "is_not_empty", label: "não está vazio" },
  ],
  number: [
    { value: "equals", label: "é igual a" },
    { value: "greater_than", label: "é maior que" },
    { value: "less_than", label: "é menor que" },
    { value: "is_empty", label: "está vazio" },
    { value: "is_not_empty", label: "não está vazio" },
  ],
  select: [
    { value: "equals", label: "é igual a" },
    { value: "not_equals", label: "não é igual a" },
    { value: "is_empty", label: "está vazio" },
    { value: "is_not_empty", label: "não está vazio" },
  ],
  status: [
    { value: "equals", label: "é igual a" },
    { value: "not_equals", label: "não é igual a" },
    { value: "is_empty", label: "está vazio" },
    { value: "is_not_empty", label: "não está vazio" },
  ],
  date: [
    { value: "equals", label: "é igual a" },
    { value: "after", label: "é depois de" },
    { value: "before", label: "é antes de" },
    { value: "is_empty", label: "está vazio" },
    { value: "is_not_empty", label: "não está vazio" },
  ],
};

export default function DatabaseView() {
  const { workspaceId, databaseId } = useParams<{
    workspaceId: string;
    databaseId: string;
  }>();
  const navigate = useNavigate();
  const dialog = useDialog();
  const [db, setDb] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewMode, setViewMode] = useState<DatabaseViewMode>("grid");
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [sorts, setSorts] = useState<SortRule[]>([]);
  const [filterDraft, setFilterDraft] = useState<FilterRule[]>([]);
  const [sortDraft, setSortDraft] = useState<SortRule[]>([]);
  const [popover, setPopover] = useState<"filter" | "sort" | null>(null);
  const [groupPropId, setGroupPropId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<DatabaseItem | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await databaseService.get(Number(databaseId), { filters, sorts });
      setDb(data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erro ao carregar o banco de dados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseId, filters, sorts]);

  useEffect(() => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      setFilters([...filterDraft]);
    }, 400);
    return () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    };
  }, [filterDraft]);

  useEffect(() => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      setSorts([...sortDraft]);
    }, 400);
    return () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    };
  }, [sortDraft]);

  function openPopover(kind: "filter" | "sort") {
    setPopover((p) => (p === kind ? null : kind));
    if (kind === "filter") setFilterDraft(filters.map((f) => ({ ...f })));
    else setSortDraft(sorts.map((s) => ({ ...s })));
  }

  function toggleView(mode: DatabaseViewMode) {
    setViewMode(mode);
    if (mode === "board" && groupPropId === null) {
      const firstChoice = db?.properties.find(
        (p) => p.type === "select" || p.type === "status"
      );
      if (firstChoice) setGroupPropId(firstChoice.id);
    }
  }

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
      setSelectedItem((sel) => (sel && sel.id === updated.id ? updated : sel));
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  async function addItem(values: Array<{ property_id: number; value: string | number | null }> = [], position?: number) {
    setBusy(true);
    try {
      const created = await databaseService.addItem(
        Number(databaseId),
        values,
        position ?? (db?.items?.length || 0) + 1
      );
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
    const ok = await dialog.confirm({
      title: "Excluir item",
      message: "Excluir este item? Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await databaseService.removeItem(Number(databaseId), itemId);
      setDb((prev) =>
        prev ? { ...prev, items: (prev.items || []).filter((i) => i.id !== itemId) } : prev
      );
      setSelectedItem((sel) => (sel && sel.id === itemId ? null : sel));
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erro ao excluir item");
    } finally {
      setBusy(false);
    }
  }

  async function addProperty() {
    const result = await dialog.prompt({
      title: "Nova propriedade",
      confirmLabel: "Adicionar",
      fields: [
        { name: "name", label: "Nome da propriedade", required: true },
        {
          name: "type",
          label: "Tipo",
          type: "select",
          required: true,
          defaultValue: "text",
          options: PROPERTY_TYPES,
        },
        {
          name: "choices",
          label: "Opções (separadas por vírgula, para select/status)",
          placeholder: "Ex.: A fazer, Em andamento, Concluído",
        },
      ],
    });
    if (!result?.name) return;
    const type = result.type as PropertyType;
    if (!PROPERTY_TYPES.includes(type)) return;
    const name = result.name;
    let options: { choices?: string[] } | undefined;
    if (type === "select" || type === "status") {
      if (result.choices)
        options = {
          choices: result.choices.split(",").map((s) => s.trim()).filter(Boolean),
        };
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
    const ok = await dialog.confirm({
      title: "Remover propriedade",
      message: `Remover a propriedade "${prop.name}"?`,
      confirmLabel: "Remover",
      danger: true,
    });
    if (!ok) return;
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
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erro ao remover propriedade");
    } finally {
      setBusy(false);
    }
  }

  async function renameDatabase() {
    const result = await dialog.prompt({
      title: "Renomear banco de dados",
      confirmLabel: "Salvar",
      fields: [
        { name: "name", label: "Nome", defaultValue: db?.name || "", required: true },
        { name: "icon", label: "Ícone (emoji)", defaultValue: db?.icon || "" },
      ],
    });
    if (!result?.name) return;
    setBusy(true);
    try {
      const updated = await databaseService.update(Number(databaseId), {
        name: result.name,
        icon: result.icon || undefined,
      });
      setDb(updated);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erro ao renomear");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDatabase() {
    const ok = await dialog.confirm({
      title: "Excluir banco de dados",
      message: "Excluir este banco de dados? Itens e propriedades serão removidos.",
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
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
    const isChoice = prop.type === "select" || prop.type === "status";
    const result = await dialog.prompt({
      title: "Editar propriedade",
      confirmLabel: "Salvar",
      fields: [
        { name: "name", label: "Nome", defaultValue: prop.name, required: true },
        ...(isChoice
          ? [
              {
                name: "choices",
                label: "Opções (separadas por vírgula)",
                defaultValue: (prop.options?.choices || []).join(", "),
              },
            ]
          : []),
      ],
    });
    if (!result?.name) return;
    const name = result.name;
    let options: { choices?: string[] } | undefined;
    if (isChoice) {
      options = {
        choices: (result.choices || "").split(",").map((s) => s.trim()).filter(Boolean),
      };
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

  const groupProp = db?.properties.find((p) => p.id === groupPropId) || null;
  const filterCount = filters.length;
  const sortCount = sorts.length;

  function updateFilter(idx: number, patch: Partial<FilterRule>) {
    setFilterDraft((draft) => {
      const next = draft.map((f, i) => (i === idx ? { ...f, ...patch } : f));
      return next;
    });
  }

  function updateSort(idx: number, patch: Partial<SortRule>) {
    setSortDraft((draft) => draft.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function renderFilterValue(prop: DatabaseProperty | undefined, rule: FilterRule, idx: number) {
    const needsValue = ["contains", "equals", "not_equals", "greater_than", "less_than", "after", "before"].includes(rule.operator);
    if (!needsValue) return null;
    if (prop && (prop.type === "select" || prop.type === "status")) {
      return (
        <select
          className="input flex-1 py-1"
          value={String(rule.value ?? "")}
          onChange={(e) => updateFilter(idx, { value: e.target.value || null })}
        >
          <option value="">—</option>
          {(prop.options?.choices || []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      );
    }
    if (prop?.type === "number") {
      return (
        <input
          type="number"
          className="input flex-1 py-1"
          value={rule.value === null || rule.value === undefined ? "" : String(rule.value)}
          onChange={(e) =>
            updateFilter(idx, { value: e.target.value === "" ? null : Number(e.target.value) })
          }
        />
      );
    }
    if (prop?.type === "date") {
      return (
        <input
          type="date"
          className="input flex-1 py-1"
          value={rule.value ? String(rule.value).slice(0, 10) : ""}
          onChange={(e) => updateFilter(idx, { value: e.target.value || null })}
        />
      );
    }
    return (
      <input
        className="input flex-1 py-1"
        value={(rule.value as string) || ""}
        onChange={(e) => updateFilter(idx, { value: e.target.value || null })}
        placeholder="Valor"
      />
    );
  }

  if (loading && !db) return <div className="p-6">Carregando…</div>;
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

      <div className="mb-4 flex flex-wrap items-center gap-4 border-b border-zinc-200/80 text-sm dark:border-zinc-800">
        <button
          onClick={() => toggleView("grid")}
          className={`pb-2 ${viewMode === "grid" ? "border-b-2 border-brand-600 font-medium" : "text-gray-500 dark:text-gray-300"}`}
        >
          🗃️ Tabela
        </button>
        <button
          onClick={() => toggleView("board")}
          className={`pb-2 ${viewMode === "board" ? "border-b-2 border-brand-600 font-medium" : "text-gray-500 dark:text-gray-300"}`}
        >
          📊 Quadro
        </button>

        <div className="relative ml-auto">
          <div className="flex gap-2">
            <button
              className={`btn-ghost ${filterCount ? "text-brand-600" : ""}`}
              onClick={() => openPopover("filter")}
            >
              🔍 Filtrar{filterCount > 0 ? ` (${filterCount})` : ""}
            </button>
            <button
              className={`btn-ghost ${sortCount ? "text-brand-600" : ""}`}
              onClick={() => openPopover("sort")}
            >
              ↕️ Ordenar{sortCount > 0 ? ` (${sortCount})` : ""}
            </button>
          </div>

          {popover === "filter" && (
            <div className="animate-scale-in absolute right-0 top-9 z-20 w-[26rem] max-w-[90vw] rounded-xl border border-zinc-200/80 bg-white p-3 shadow-soft-lg dark:border-zinc-800 dark:bg-surface-dark">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Filtros</span>
                <button
                  className="text-xs text-brand-600 hover:underline"
                  onClick={() => setFilterDraft([])}
                >
                  Limpar todos
                </button>
              </div>
              {filterDraft.length === 0 && (
                <p className="mb-2 text-sm text-gray-400">Nenhum filtro aplicado.</p>
              )}
              {filterDraft.map((rule, idx) => {
                const prop = db?.properties.find((p) => p.id === rule.property_id);
                return (
                  <div key={idx} className="mb-2 flex flex-wrap items-center gap-2">
                    <select
                      className="input w-28 py-1"
                      value={rule.property_id}
                      onChange={(e) =>
                        updateFilter(idx, {
                          property_id: Number(e.target.value),
                          operator: "equals",
                          value: null,
                        })
                      }
                    >
                      {(db?.properties || []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input w-32 py-1"
                      value={rule.operator}
                      onChange={(e) =>
                        updateFilter(idx, { operator: e.target.value as FilterOperator })
                      }
                    >
                      {OPERATORS_BY_TYPE[prop?.type || "text"].map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                    {renderFilterValue(prop, rule, idx)}
                    <button
                      className="text-gray-400 hover:text-red-500"
                      onClick={() =>
                        setFilterDraft((d) => d.filter((_, i) => i !== idx))
                      }
                      title="Remover filtro"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              <button
                className="btn-ghost"
                onClick={() =>
                  setFilterDraft((d) => [
                    ...d,
                    {
                      property_id: db?.properties[0]?.id ?? 0,
                      operator: "contains",
                      value: null,
                    },
                  ])
                }
              >
                + Adicionar filtro
              </button>
            </div>
          )}

          {popover === "sort" && (
            <div className="animate-scale-in absolute right-0 top-9 z-20 w-80 max-w-[90vw] rounded-xl border border-zinc-200/80 bg-white p-3 shadow-soft-lg dark:border-zinc-800 dark:bg-surface-dark">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Ordenação</span>
                <button
                  className="text-xs text-brand-600 hover:underline"
                  onClick={() => setSortDraft([])}
                >
                  Limpar todas
                </button>
              </div>
              {sortDraft.length === 0 && (
                <p className="mb-2 text-sm text-gray-400">Nenhuma ordenação aplicada.</p>
              )}
              {sortDraft.map((rule, idx) => (
                <div key={idx} className="mb-2 flex items-center gap-2">
                  <select
                    className="input flex-1 py-1"
                    value={rule.property_id}
                    onChange={(e) => updateSort(idx, { property_id: Number(e.target.value) })}
                  >
                    {(db?.properties || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input w-24 py-1"
                    value={rule.direction}
                    onChange={(e) =>
                      updateSort(idx, { direction: e.target.value as SortDirection })
                    }
                  >
                    <option value="asc">↑ Cresc.</option>
                    <option value="desc">↓ Decresc.</option>
                  </select>
                  <button
                    className="text-gray-400 hover:text-red-500"
                    onClick={() => setSortDraft((d) => d.filter((_, i) => i !== idx))}
                    title="Remover ordenação"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                className="btn-ghost"
                onClick={() =>
                  setSortDraft((d) => [
                    ...d,
                    { property_id: db?.properties[0]?.id ?? 0, direction: "asc" },
                  ])
                }
              >
                + Adicionar ordenação
              </button>
            </div>
          )}
        </div>
      </div>

      {viewMode === "board" ? (
        groupProp && db ? (
          <KanbanBoard
            db={db}
            groupProp={groupProp}
            onGroupPropChange={(propId) => setGroupPropId(propId)}
            busy={busy}
            onMoveItem={(item, newValue) =>
              saveCell(item, groupProp, newValue)
            }
            onAddItem={(columnValue) =>
              addItem([{ property_id: groupProp.id, value: columnValue }])
            }
            onOpenItem={(item) => setSelectedItem(item)}
          />
        ) : (
          <div className="card text-sm text-zinc-500 dark:text-zinc-400">
            O quadro precisa de uma propriedade <b>select</b> ou <b>status</b> para agrupar os itens.
            <button className="btn-ghost ml-2" onClick={addProperty}>
              + Adicionar propriedade
            </button>
          </div>
        )
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200/80 dark:border-zinc-800">
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
                  className="border-b border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800/70 dark:hover:bg-zinc-800/40"
                >
                  <td className="p-2 text-gray-400">{idx + 1}</td>
                  {db?.properties.map((prop) => (
                    <td key={prop.id} className="p-2">
                      <CellEditor
                        prop={prop}
                        value={getItemValue(item, prop.id)}
                        onChange={(v) => saveCell(item, prop, v)}
                        disabled={busy}
                        compact
                      />
                    </td>
                  ))}
                  <td className="p-2">
                    <div className="flex gap-1">
                      <button
                        className="text-gray-400 hover:text-brand-600"
                        title="Abrir item"
                        onClick={() => setSelectedItem(item)}
                      >
                        ⤢
                      </button>
                      <button
                        className="text-gray-400 hover:text-red-500"
                        title="Excluir item"
                        onClick={() => deleteItem(item.id)}
                        disabled={busy}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3">
            <button className="btn-ghost" onClick={() => addItem()} disabled={busy}>
              + Adicionar item
            </button>
          </div>
        </div>
      )}

      {selectedItem && db && (
        <RowDetailModal
          db={db}
          item={selectedItem}
          busy={busy}
          onSave={(propId, value) => {
            const prop = db.properties.find((p) => p.id === propId);
            if (prop) saveCell(selectedItem, prop, value);
          }}
          onDelete={() => deleteItem(selectedItem.id)}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

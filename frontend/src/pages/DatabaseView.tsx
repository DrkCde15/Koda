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
import { Icon } from "@/components/ui/icons";
import { Skeleton, Reveal } from "@/components/ui/primitives";

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

function Popover({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [onClose]);
  return (
    <div
      ref={ref}
      className="animate-scale-in absolute right-0 top-11 z-20 w-[26rem] max-w-[92vw] overflow-hidden rounded-2xl border bg-[var(--koda-surface)] p-4 shadow-float"
      style={{ borderColor: "var(--koda-border)" }}
    >
      {children}
    </div>
  );
}

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

  function commitCellValue(item: DatabaseItem, prop: DatabaseProperty, value: string | number | null) {
    if (value === null || value === undefined || value === "") {
      const currentValue = getItemValue(item, prop.id);
      if (currentValue === null || currentValue === undefined || currentValue === "") return;
    }
    saveCell(item, prop, value);
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
        { name: "type", label: "Tipo", type: "select", required: true, defaultValue: "text", options: PROPERTY_TYPES },
        { name: "choices", label: "Opções (separadas por vírgula, para select/status)", placeholder: "Ex.: A fazer, Em andamento, Concluído" },
      ],
    });
    if (!result?.name) return;
    const type = result.type as PropertyType;
    if (!PROPERTY_TYPES.includes(type)) return;
    const name = result.name;
    let options: { choices?: string[] } | undefined;
    if (type === "select" || type === "status") {
      if (result.choices)
        options = { choices: result.choices.split(",").map((s) => s.trim()).filter(Boolean) };
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
          ? [{ name: "choices", label: "Opções (separadas por vírgula)", defaultValue: (prop.options?.choices || []).join(", ") }]
          : []),
      ],
    });
    if (!result?.name) return;
    const name = result.name;
    let options: { choices?: string[] } | undefined;
    if (isChoice) {
      options = { choices: (result.choices || "").split(",").map((s) => s.trim()).filter(Boolean) };
    }
    setBusy(true);
    try {
      const updated = await databaseService.updateProperty(Number(databaseId), prop.id, { name, options });
      setDb((prev) =>
        prev
          ? { ...prev, properties: prev.properties.map((p) => (p.id === updated.id ? updated : p)) }
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
          className="input flex-1 !py-1.5"
          value={String(rule.value ?? "")}
          onChange={(e) => updateFilter(idx, { value: e.target.value || null })}
        >
          <option value="">—</option>
          {(prop.options?.choices || []).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      );
    }
    if (prop?.type === "number") {
      return (
        <input
          type="number"
          className="input flex-1 !py-1.5"
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
          className="input flex-1 !py-1.5"
          value={rule.value ? String(rule.value).slice(0, 10) : ""}
          onChange={(e) => updateFilter(idx, { value: e.target.value || null })}
        />
      );
    }
    return (
      <input
        className="input flex-1 !py-1.5"
        value={(rule.value as string) || ""}
        onChange={(e) => updateFilter(idx, { value: e.target.value || null })}
        placeholder="Valor"
      />
    );
  }

  if (loading && !db)
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12" />
            <Skeleton className="h-7 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <Skeleton className="mt-8 h-12 w-full" />
        <Skeleton className="mt-4 h-96 w-full" />
      </div>
    );
  if (error && !db)
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          <Icon name="x" className="h-5 w-5" />
        </span>
        <p className="text-sm text-red-500">{error}</p>
        <button className="btn-secondary" onClick={load}>Tentar novamente</button>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      {/* Back */}
      <button
        className="btn-ghost !py-1.5 text-xs"
        onClick={() => navigate(`/workspaces/${workspaceId}`)}
      >
        <Icon name="arrowLeft" className="h-3.5 w-3.5" />
        Voltar ao workspace
      </button>

      {/* Header */}
      <Reveal delay={40}>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {db?.icon && <span className="text-3xl">{db.icon}</span>}
            <div>
              <h1 className="text-2xl font-bold tracking-tightest">{db?.name}</h1>
              <p className="text-xs text-[var(--koda-text-faint)]">
                {(db?.items || []).length} itens · {db?.properties.length} propriedades
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={renameDatabase} disabled={busy}>
              <Icon name="edit" className="h-4 w-4" />
              Renomear
            </button>
            <button
              className="btn-ghost !text-red-500 hover:!bg-red-500/10 hover:!text-red-600"
              onClick={deleteDatabase}
              disabled={busy}
            >
              <Icon name="trash" className="h-4 w-4" />
              Excluir
            </button>
          </div>
        </div>
      </Reveal>

      {error && <div className="mt-3 text-sm text-red-500">{error}</div>}

      {/* Toolbar */}
      <Reveal delay={100}>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-[var(--koda-border)] bg-[var(--koda-surface)] p-1 shadow-soft-sm">
            <button
              onClick={() => toggleView("grid")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                viewMode === "grid"
                  ? "bg-brand-gradient text-white shadow-glow-brand"
                  : "text-[var(--koda-text-muted)] hover:text-[var(--koda-text)]"
              }`}
            >
              <Icon name="grid" className="h-3.5 w-3.5" />
              Tabela
            </button>
            <button
              onClick={() => toggleView("board")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                viewMode === "board"
                  ? "bg-brand-gradient text-white shadow-glow-brand"
                  : "text-[var(--koda-text-muted)] hover:text-[var(--koda-text)]"
              }`}
            >
              <Icon name="kanban" className="h-3.5 w-3.5" />
              Quadro
            </button>
          </div>

          <div className="relative ml-auto">
            <div className="flex gap-1.5">
              <button
                className={`chip ${filterCount ? "chip-active" : ""}`}
                onClick={() => openPopover("filter")}
              >
                <Icon name="filter" className="h-3.5 w-3.5" />
                Filtrar
                {filterCount > 0 && <span className="badge !bg-brand-500 !text-white !px-1.5 !min-w-4">{filterCount}</span>}
              </button>
              <button
                className={`chip ${sortCount ? "chip-active" : ""}`}
                onClick={() => openPopover("sort")}
              >
                <Icon name="sort" className="h-3.5 w-3.5" />
                Ordenar
                {sortCount > 0 && <span className="badge !bg-brand-500 !text-white !px-1.5 !min-w-4">{sortCount}</span>}
              </button>
            </div>

            {popover === "filter" && (
              <Popover onClose={() => setPopover(null)}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--koda-text)]">Filtros</span>
                  <button
                    className="text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-300"
                    onClick={() => setFilterDraft([])}
                  >
                    Limpar todos
                  </button>
                </div>
                {filterDraft.length === 0 && (
                  <p className="mb-2 text-sm text-[var(--koda-text-faint)]">Nenhum filtro aplicado.</p>
                )}
                <div className="space-y-2">
                  {filterDraft.map((rule, idx) => {
                    const prop = db?.properties.find((p) => p.id === rule.property_id);
                    return (
                      <div key={idx} className="flex flex-wrap items-center gap-1.5">
                        <select
                          className="input w-28 !py-1.5"
                          value={rule.property_id}
                          onChange={(e) =>
                            updateFilter(idx, { property_id: Number(e.target.value), operator: "equals", value: null })
                          }
                        >
                          {(db?.properties || []).map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <select
                          className="input w-32 !py-1.5"
                          value={rule.operator}
                          onChange={(e) => updateFilter(idx, { operator: e.target.value as FilterOperator })}
                        >
                          {OPERATORS_BY_TYPE[prop?.type || "text"].map((op) => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                        {renderFilterValue(prop, rule, idx)}
                        <button
                          className="btn-icon h-7 w-7 hover:!text-red-500"
                          onClick={() => setFilterDraft((d) => d.filter((_, i) => i !== idx))}
                          title="Remover filtro"
                        >
                          <Icon name="x" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  className="btn-ghost !px-3 !py-1.5 mt-3 text-xs"
                  onClick={() =>
                    setFilterDraft((d) => [
                      ...d,
                      { property_id: db?.properties[0]?.id ?? 0, operator: "contains", value: null },
                    ])
                  }
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  Adicionar filtro
                </button>
              </Popover>
            )}

            {popover === "sort" && (
              <Popover onClose={() => setPopover(null)}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--koda-text)]">Ordenação</span>
                  <button
                    className="text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-300"
                    onClick={() => setSortDraft([])}
                  >
                    Limpar todas
                  </button>
                </div>
                {sortDraft.length === 0 && (
                  <p className="mb-2 text-sm text-[var(--koda-text-faint)]">Nenhuma ordenação aplicada.</p>
                )}
                <div className="space-y-2">
                  {sortDraft.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <select
                        className="input flex-1 !py-1.5"
                        value={rule.property_id}
                        onChange={(e) => updateSort(idx, { property_id: Number(e.target.value) })}
                      >
                        {(db?.properties || []).map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <select
                        className="input w-24 !py-1.5"
                        value={rule.direction}
                        onChange={(e) => updateSort(idx, { direction: e.target.value as SortDirection })}
                      >
                        <option value="asc">↑ Cresc.</option>
                        <option value="desc">↓ Decresc.</option>
                      </select>
                      <button
                        className="btn-icon h-7 w-7 hover:!text-red-500"
                        onClick={() => setSortDraft((d) => d.filter((_, i) => i !== idx))}
                        title="Remover ordenação"
                      >
                        <Icon name="x" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="btn-ghost mt-3 px-3 py-1.5 text-xs"
                  onClick={() =>
                    setSortDraft((d) => [...d, { property_id: db?.properties[0]?.id ?? 0, direction: "asc" }])
                  }
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  Adicionar ordenação
                </button>
              </Popover>
            )}
          </div>
        </div>
      </Reveal>

      {/* Body */}
      <Reveal delay={160}>
        {viewMode === "board" ? (
          groupProp && db ? (
            <KanbanBoard
              db={db}
              groupProp={groupProp}
              onGroupPropChange={(propId) => setGroupPropId(propId)}
              busy={busy}
              onMoveItem={(item, newValue) => saveCell(item, groupProp, newValue)}
              onAddItem={(columnValue) => addItem([{ property_id: groupProp.id, value: columnValue }])}
              onOpenItem={(item) => setSelectedItem(item)}
            />
          ) : (
            <div className="card flex flex-col items-center gap-3 p-10 text-center text-sm text-[var(--koda-text-muted)]">
              <Icon name="kanban" className="h-8 w-8 text-[var(--koda-text-faint)]" />
              <p>
                O quadro precisa de uma propriedade <b className="text-[var(--koda-text)]">select</b> ou{" "}
                <b className="text-[var(--koda-text)]">status</b> para agrupar os itens.
              </p>
              <button className="btn-secondary" onClick={addProperty}>
                <Icon name="plus" className="h-4 w-4" />
                Adicionar propriedade
              </button>
            </div>
          )
        ) : (
          <div className="card overflow-hidden !p-0">
            <div className="overflow-x-auto">
              <table className="premium-table min-w-[640px]">
                <thead>
                  <tr>
                    <th className="w-12 text-center">#</th>
                    {db?.properties.map((prop) => (
                      <th key={prop.id} className="min-w-40">
                        <div className="flex items-center gap-2">
                          <span>{prop.name}</span>
                          <span className="normal-case tracking-normal text-[10px] font-medium bg-[var(--koda-surface-2)] rounded px-1.5 py-0.5">
                            {prop.type}
                          </span>
                          <div className="ml-1 flex items-center rounded-lg bg-[var(--koda-surface)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            <button
                              className="btn-icon h-6 w-6 !rounded-md"
                              title="Editar propriedade"
                              onClick={() => editProperty(prop)}
                            >
                              <Icon name="edit" className="h-3 w-3" />
                            </button>
                            <button
                              className="btn-icon h-6 w-6 !rounded-md hover:!text-red-500"
                              title="Remover propriedade"
                              onClick={() => deleteProperty(prop)}
                            >
                              <Icon name="x" className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}
                    <th className="w-28">
                      <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={addProperty} disabled={busy}>
                        <Icon name="plus" className="h-3 w-3" />
                        Propriedade
                      </button>
                    </th>
                    <th className="w-24" />
                  </tr>
                </thead>
                <tbody>
                  {(db?.items || []).map((item, idx) => (
                    <tr key={item.id} className="group">
                      <td className="text-center font-mono text-xs text-[var(--koda-text-faint)]">{idx + 1}</td>
                      {db?.properties.map((prop) => (
                        <td key={prop.id}>
                          <CellEditor
                            prop={prop}
                            value={getItemValue(item, prop.id)}
                            onChange={(v) => commitCellValue(item, prop, v)}
                            disabled={busy}
                            compact
                          />
                        </td>
                      ))}
                      <td>
                        <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={addProperty} disabled={busy}>
                          <Icon name="plus" className="h-3 w-3" />
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center gap-0.5">
                          <button
                            className="btn-icon h-7 w-7"
                            title="Abrir item"
                            onClick={() => setSelectedItem(item)}
                          >
                            <Icon name="external" className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="btn-icon h-7 w-7 hover:!text-red-500"
                            title="Excluir item"
                            onClick={() => deleteItem(item.id)}
                            disabled={busy}
                          >
                            <Icon name="trash" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t px-4 py-3" style={{ borderColor: "var(--koda-border)" }}>
              <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => addItem()} disabled={busy}>
                <Icon name="plus" className="h-3.5 w-3.5" />
                Adicionar item
              </button>
            </div>
          </div>
        )}
      </Reveal>

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
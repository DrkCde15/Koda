import { useMemo, useState } from "react";
import { Database, DatabaseItem, DatabaseProperty } from "@/types";
import { getItemTitle, getItemValue } from "@/components/DatabaseCells";
import { Icon } from "@/components/ui/icons";

const NONE = "__none__";

interface KanbanBoardProps {
  db: Database;
  groupProp: DatabaseProperty;
  onGroupPropChange: (propId: number) => void;
  busy?: boolean;
  onMoveItem: (item: DatabaseItem, newValue: string | null) => void;
  onAddItem: (columnValue: string | null) => void;
  onOpenItem: (item: DatabaseItem) => void;
}

const COLORS = [
  { dot: "bg-sky-500", soft: "text-sky-700 bg-sky-500/12 dark:text-sky-300 dark:bg-sky-500/15" },
  { dot: "bg-emerald-500", soft: "text-emerald-700 bg-emerald-500/12 dark:text-emerald-300 dark:bg-emerald-500/15" },
  { dot: "bg-amber-500", soft: "text-amber-700 bg-amber-500/12 dark:text-amber-300 dark:bg-amber-500/15" },
  { dot: "bg-rose-500", soft: "text-rose-700 bg-rose-500/12 dark:text-rose-300 dark:bg-rose-500/15" },
  { dot: "bg-violet-500", soft: "text-violet-700 bg-violet-500/12 dark:text-violet-300 dark:bg-violet-500/15" },
  { dot: "bg-fuchsia-500", soft: "text-fuchsia-700 bg-fuchsia-500/12 dark:text-fuchsia-300 dark:bg-fuchsia-500/15" },
  { dot: "bg-teal-500", soft: "text-teal-700 bg-teal-500/12 dark:text-teal-300 dark:bg-teal-500/15" },
  { dot: "bg-orange-500", soft: "text-orange-700 bg-orange-500/12 dark:text-orange-300 dark:bg-orange-500/15" },
];

export function colorStyleFor(label: string): { dot: string; soft: string } {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface Column {
  key: string;
  label: string;
  value: string | null;
  items: DatabaseItem[];
}

export function KanbanBoard({
  db,
  groupProp,
  onGroupPropChange,
  busy,
  onMoveItem,
  onAddItem,
  onOpenItem,
}: KanbanBoardProps) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  const choices = useMemo(() => {
    const isChoice = groupProp.type === "select" || groupProp.type === "status";
    const choices = isChoice ? (groupProp.options?.choices || []) : [];
    return [...choices, NONE];
  }, [groupProp]);

  const columns: Column[] = useMemo(() => {
    const items = db.items || [];
    return choices.map((choice) => {
      const value = choice === NONE ? null : choice;
      return {
        key: choice,
        label: value === null ? "Sem valor" : value,
        value,
        items: items.filter((it) => {
          const v = getItemValue(it, groupProp.id);
          return value === null ? !v : v === value;
        }),
      };
    });
  }, [choices, db.items, groupProp.id]);

  function drop(column: Column) {
    if (dragId === null) return;
    const item = (db.items || []).find((it) => it.id === dragId);
    if (item) onMoveItem(item, column.value);
    setDragId(null);
    setOverKey(null);
  }

  const showGroupPicker = (db.properties.filter((p) => p.type === "select" || p.type === "status").length) > 1;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--koda-text-faint)]">
          Agrupar por
        </span>
        {showGroupPicker ? (
          <select
            className="input w-52 !py-1.5"
            value={groupProp.id}
            onChange={(e) => onGroupPropChange(Number(e.target.value))}
          >
            {db.properties
              .filter((p) => p.type === "select" || p.type === "status")
              .map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
          </select>
        ) : (
          <span className="chip chip-active">{groupProp.name}</span>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
        {columns.map((col) => {
          const colors = colorStyleFor(col.label);
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOverKey(col.key);
              }}
              onDragLeave={() => setOverKey((k) => (k === col.key ? null : k))}
              onDrop={() => drop(col)}
              className={`w-72 shrink-0 rounded-2xl border p-2.5 transition-all duration-200 ${
                overKey === col.key
                  ? "border-brand-500/60 bg-brand-500/[0.05] ring-2 ring-brand-500/20"
                  : "border-[var(--koda-border)] bg-[var(--koda-surface)]/60"
              }`}
            >
              <div className="mb-2.5 flex items-center justify-between px-1.5">
                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--koda-text)]">
                  <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                  {col.label}
                  <span className="badge !bg-[var(--koda-surface-2)] !text-[var(--koda-text-muted)]">
                    {col.items.length}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn-icon h-7 w-7"
                  title="Adicionar card"
                  onClick={() => onAddItem(col.value)}
                  disabled={busy}
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {col.items.map((item) => (
                  <div
                    key={item.id}
                    draggable={!busy}
                    onDragStart={() => setDragId(item.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverKey(null);
                    }}
                    onClick={() => onOpenItem(item)}
                    className={`group cursor-pointer rounded-xl border border-[var(--koda-border)] bg-[var(--koda-surface)] p-3 shadow-soft-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft ${dragId === item.id ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug text-[var(--koda-text)]">
                        {getItemTitle(item, db.properties)}
                      </p>
                      <Icon name="drag" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--koda-text-faint)] opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {db.properties
                        .filter((p) => p.id !== groupProp.id)
                        .map((p) => {
                          const v = getItemValue(item, p.id);
                          if (v === null || v === "") return null;
                          return (
                            <span
                              key={p.id}
                              className="rounded-lg bg-[var(--koda-surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--koda-text-muted)]"
                            >
                              {String(v)}
                            </span>
                          );
                        })}
                    </div>
                  </div>
                ))}
                {col.items.length === 0 && (
                  <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-[var(--koda-border)] px-3 py-6 text-center">
                    <Icon name="drag" className="h-4 w-4 text-[var(--koda-text-faint)]" />
                    <p className="text-xs text-[var(--koda-text-faint)]">Solte um card aqui</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
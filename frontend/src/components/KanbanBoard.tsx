import { useMemo, useState } from "react";
import { Database, DatabaseItem, DatabaseProperty } from "@/types";
import { getItemTitle, getItemValue } from "@/components/DatabaseCells";

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
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
];

export function colorFor(label: string): string {
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
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500 dark:text-gray-400">Agrupar por:</span>
        {showGroupPicker ? (
          <select
            className="input w-48 py-1"
            value={groupProp.id}
            onChange={(e) => onGroupPropChange(Number(e.target.value))}
          >
            {db.properties
              .filter((p) => p.type === "select" || p.type === "status")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        ) : (
          <span className="font-medium">{groupProp.name}</span>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              setOverKey(col.key);
            }}
            onDragLeave={() => setOverKey((k) => (k === col.key ? null : k))}
            onDrop={() => drop(col)}
            className={`w-64 shrink-0 rounded-xl border bg-zinc-50/80 p-2 dark:bg-zinc-900/50 ${
              overKey === col.key
                ? "border-brand-500 ring-2 ring-brand-500/30"
                : "border-zinc-200/80 dark:border-zinc-800"
            }`}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colorFor(col.label)}`}>
                  {col.label}
                </span>
                <span className="text-xs text-zinc-400">{col.items.length}</span>
              </span>
              <button
                type="button"
                className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                title="Adicionar card"
                onClick={() => onAddItem(col.value)}
                disabled={busy}
              >
                ＋
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
                  className="cursor-pointer rounded-lg border border-zinc-200/80 bg-white p-2.5 shadow-soft-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {getItemTitle(item, db.properties)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {db.properties
                      .filter((p) => p.id !== groupProp.id)
                      .map((p) => {
                        const v = getItemValue(item, p.id);
                        if (v === null || v === "") return null;
                        return (
                          <span
                            key={p.id}
                            className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-300"
                          >
                            {String(v)}
                          </span>
                        );
                      })}
                  </div>
                </div>
              ))}
              {col.items.length === 0 && (
                <p className="px-1 text-xs text-gray-400">Nenhum item</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

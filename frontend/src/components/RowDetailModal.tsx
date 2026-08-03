import { useEffect, useRef } from "react";
import { Database, DatabaseItem, DatabaseProperty } from "@/types";
import { CellEditor, getItemValue } from "@/components/DatabaseCells";

interface RowDetailModalProps {
  db: Database;
  item: DatabaseItem;
  busy?: boolean;
  onSave: (propertyId: number, value: string | number | null) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function RowDetailModal({ db, item, busy, onSave, onDelete, onClose }: RowDetailModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const firstProp = db.properties[0];

  function change(prop: DatabaseProperty, value: string | number | null) {
    onSave(prop.id, value);
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="animate-scale-in flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-zinc-200/80 bg-white shadow-soft-lg dark:border-zinc-800 dark:bg-surface-dark"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <span className="text-sm font-semibold tracking-tight text-zinc-700 dark:text-zinc-200">
            Item #{item.id}
          </span>
          <button
            type="button"
            className="rounded-md px-1.5 py-0.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {firstProp && (
            <div>
              <span className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {firstProp.name}
              </span>
              <input
                className="w-full border-none bg-transparent text-2xl font-bold tracking-tight text-zinc-900 outline-none dark:text-white"
                value={(getItemValue(item, firstProp.id) as string) || ""}
                onChange={(e) => change(firstProp, e.target.value || null)}
                disabled={busy}
                placeholder="Sem título"
              />
            </div>
          )}

          {db.properties.slice(firstProp ? 1 : 0).map((prop) => (
            <div key={prop.id}>
              <span className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {prop.name}
                <span className="ml-1 normal-case text-zinc-400">({prop.type})</span>
              </span>
              <CellEditor
                prop={prop}
                value={getItemValue(item, prop.id)}
                onChange={(v) => change(prop, v)}
                disabled={busy}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-between border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <button
            type="button"
            className="text-sm font-medium text-red-500 transition-colors hover:text-red-600 disabled:opacity-50"
            onClick={onDelete}
            disabled={busy}
          >
            🗑 Excluir item
          </button>
          <button type="button" className="btn-primary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

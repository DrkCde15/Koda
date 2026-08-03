import { useEffect, useRef } from "react";
import { Database, DatabaseItem, DatabaseProperty } from "@/types";
import { CellEditor, getItemValue } from "@/components/DatabaseCells";
import { Icon } from "@/components/ui/icons";

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
  const firstTitle = firstProp ? (getItemValue(item, firstProp.id) as string) || "" : "";

  function change(prop: DatabaseProperty, value: string | number | null) {
    onSave(prop.id, value);
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[55] flex items-center justify-center p-4"
      style={{ background: "rgb(8 9 13 / 0.55)", backdropFilter: "blur(8px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="animate-scale-in flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border bg-[var(--koda-surface)] shadow-float"
        style={{ borderColor: "var(--koda-border)" }}
      >
        <div className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: "var(--koda-border)" }}
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
              <Icon name="database" className="h-4 w-4" />
            </span>
<span className="font-semibold tracking-tight text-[var(--koda-text)]">
              {firstTitle || `Item #${item.id}`}
            </span>
          </div>
          <button
            type="button"
            className="btn-icon h-8 w-8"
            onClick={onClose}
            aria-label="Fechar"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {firstProp && (
            <div>
              <span className="field-muted mb-1.5 block">{firstProp.name}</span>
              <input
                className="w-full border-none bg-transparent text-2xl font-bold tracking-tight text-[var(--koda-text)] outline-none placeholder:text-[var(--koda-text-faint)]"
                value={firstTitle}
                onChange={(e) => change(firstProp, e.target.value || null)}
                disabled={busy}
                placeholder="Sem título"
              />
            </div>
          )}

          {db.properties.slice(firstProp ? 1 : 0).map((prop) => (
            <div key={prop.id}>
              <span className="field-muted mb-1.5 block">
                {prop.name}
                <span className="ml-1.5 normal-case text-[var(--koda-text-faint)]">({prop.type})</span>
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

        <div className="flex items-center justify-between border-t px-6 py-4"
          style={{ borderColor: "var(--koda-border)" }}
        >
          <button
            type="button"
            className="btn-ghost !text-red-500 hover:!bg-red-500/10 hover:!text-red-600"
            onClick={onDelete}
            disabled={busy}
          >
            <Icon name="trash" className="h-4 w-4" />
            Excluir item
          </button>
          <button type="button" className="btn-primary" onClick={onClose}>
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
}
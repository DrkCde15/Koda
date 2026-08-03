import { DatabaseItem, DatabaseProperty } from "@/types";

export function getItemValue(
  item: DatabaseItem,
  propId: number
): string | number | null {
  return item.values[String(propId)]?.value ?? null;
}

export function toDateInput(value: string | number | null): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** First text-ish property used as the "title" of a row. */
export function getTitleProp(props: DatabaseProperty[]): DatabaseProperty | undefined {
  return (
    props.find((p) => p.type === "text") ||
    props.find((p) => p.type === "status") ||
    props[0]
  );
}

export function getItemTitle(item: DatabaseItem, props: DatabaseProperty[]): string {
  const title = getTitleProp(props);
  if (!title) return "Sem título";
  const v = getItemValue(item, title.id);
  if (v === null || v === undefined || v === "") return "Sem título";
  return String(v);
}

export interface CellEditorProps {
  prop: DatabaseProperty;
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function CellEditor({ prop, value, onChange, disabled, compact }: CellEditorProps) {
  const isSelect = prop.type === "select" || prop.type === "status";
  const inputClass = compact
    ? "w-full rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-sm outline-none transition-all duration-150 hover:border-[var(--koda-border-strong)] focus:border-brand-500/60 focus:bg-[var(--koda-surface)] focus:shadow-soft-sm dark:hover:border-[var(--koda-border-strong)]"
    : "input";

  if (isSelect) {
    return (
      <select
        className={compact ? "input !w-full !py-1.5 !rounded-lg text-sm" : "input"}
        value={(value as string) || ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
      >
        <option value="">—</option>
        {(prop.options?.choices || []).map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    );
  }
  if (prop.type === "date") {
    return (
      <input
        type="date"
        className={inputClass}
        value={toDateInput(value)}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
      />
    );
  }
  if (prop.type === "number") {
    return (
      <input
        type="number"
        className={inputClass}
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        disabled={disabled}
      />
    );
  }
  return (
    <input
      className={inputClass}
      value={(value as string) || ""}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
      placeholder={compact ? "…" : "Digite…"}
    />
  );
}
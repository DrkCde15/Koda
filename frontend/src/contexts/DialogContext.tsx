import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";

export type DialogOption = string | { label: string; value: string };

export interface DialogField {
  name: string;
  label: string;
  type?: "text" | "select";
  defaultValue?: string;
  placeholder?: string;
  options?: DialogOption[];
  required?: boolean;
}

function normalizeOption(opt: DialogOption): { label: string; value: string } {
  return typeof opt === "string" ? { label: opt, value: opt } : opt;
}

interface PromptOptions {
  title: string;
  description?: string;
  fields: DialogField[];
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface DialogContextValue {
  prompt: (options: PromptOptions) => Promise<Record<string, string> | null>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

type PromptState = {
  kind: "prompt";
  options: PromptOptions;
  resolve: (value: Record<string, string> | null) => void;
};

type ConfirmState = {
  kind: "confirm";
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

type DialogState = PromptState | ConfirmState;

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const firstFieldRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<Record<string, string> | null>((resolve) => {
      const initial: Record<string, string> = {};
      options.fields.forEach((f) => {
        initial[f.name] = f.defaultValue ?? "";
      });
      setValues(initial);
      setDialog({ kind: "prompt", options, resolve });
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({ kind: "confirm", options, resolve });
    });
  }, []);

  const close = useCallback(() => setDialog(null), []);

  const cancel = useCallback(() => {
    if (!dialog) return;
    if (dialog.kind === "prompt") dialog.resolve(null);
    else dialog.resolve(false);
    close();
  }, [dialog, close]);

  const submitPrompt = useCallback(() => {
    if (!dialog || dialog.kind !== "prompt") return;
    for (const f of dialog.options.fields) {
      if (f.required && !values[f.name]?.trim()) return;
    }
    dialog.resolve(values);
    close();
  }, [dialog, values, close]);

  const acceptConfirm = useCallback(() => {
    if (!dialog || dialog.kind !== "confirm") return;
    dialog.resolve(true);
    close();
  }, [dialog, close]);

  useEffect(() => {
    if (!dialog) return;
    const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [dialog, cancel]);

  return (
    <DialogContext.Provider value={{ prompt, confirm }}>
      {children}
      {dialog && (
        <div
          className="animate-fade-in fixed inset-0 z-[55] flex items-center justify-center p-4"
          style={{ background: "rgb(8 9 13 / 0.55)", backdropFilter: "blur(8px)" }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cancel();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="animate-pop w-full max-w-md overflow-hidden rounded-3xl border bg-[var(--koda-surface)] shadow-float"
            style={{ borderColor: "var(--koda-border)" }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgb(var(--koda-glow) / 0.6), transparent)",
              }}
            />
            <div className="relative px-6 pt-6">
              <div className="mb-1 flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl text-base transition-transform ${
                    dialog.kind === "confirm" && dialog.options.danger
                      ? "bg-red-500/10 text-red-500"
                      : "brand-orb"
                  }`}
                  style={
                    dialog.kind === "confirm" && !dialog.options.danger
                      ? { background: "rgb(93 91 239 / 0.12)", color: "#5d5bef" }
                      : undefined
                  }
                >
                  {dialog.kind === "confirm"
                    ? dialog.options.danger
                      ? <Icon name="trash" className="h-5 w-5" />
                      : <Icon name="sparkles" className="h-5 w-5" />
                    : <Icon name="edit" className="h-5 w-5" />}
                </span>
                <h2 className="text-lg font-semibold tracking-tight text-[var(--koda-text)]">
                  {dialog.options.title}
                </h2>
              </div>
            </div>

            <div className="px-6">
              {dialog.kind === "prompt" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitPrompt();
                  }}
                >
                  {dialog.options.description && (
                    <p className="mb-3 text-sm text-[var(--koda-text-muted)]">
                      {dialog.options.description}
                    </p>
                  )}
                  <div className="space-y-4">
                    {dialog.options.fields.map((field, idx) => (
                      <label key={field.name} className="block">
                        <span className="field-muted mb-1.5 block">
                          {field.label}
                          {field.required && <span className="text-red-500"> *</span>}
                        </span>
                        {field.type === "select" ? (
                          <select
                            ref={idx === 0 ? (el) => (firstFieldRef.current = el) : undefined}
                            className="input w-full"
                            value={values[field.name] ?? ""}
                            onChange={(e) =>
                              setValues((v) => ({ ...v, [field.name]: e.target.value }))
                            }
                          >
                            {!field.required && <option value="">—</option>}
                            {(field.options || []).map((opt) => {
                              const o = normalizeOption(opt);
                              return (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <input
                            ref={idx === 0 ? (el) => (firstFieldRef.current = el) : undefined}
                            className="input w-full"
                            placeholder={field.placeholder}
                            value={values[field.name] ?? ""}
                            onChange={(e) =>
                              setValues((v) => ({ ...v, [field.name]: e.target.value }))
                            }
                          />
                        )}
                      </label>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-end gap-2.5 border-t pt-5 pb-2"
                    style={{ borderColor: "var(--koda-border)" }}
                  >
                    <button type="button" className="btn-secondary" onClick={cancel}>
                      {dialog.options.cancelLabel || "Cancelar"}
                    </button>
                    <button type="submit" className="btn-primary">
                      {dialog.options.confirmLabel || "Confirmar"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {dialog.options.message && (
                    <p className="text-sm leading-relaxed text-[var(--koda-text-muted)]">
                      {dialog.options.message}
                    </p>
                  )}
                  <div className="mt-6 flex justify-end gap-2.5 border-t pt-5 pb-2"
                    style={{ borderColor: "var(--koda-border)" }}
                  >
                    <button type="button" className="btn-secondary" onClick={cancel}>
                      {dialog.options.cancelLabel || "Cancelar"}
                    </button>
                    {dialog.options.danger ? (
                      <button type="button" className="btn-danger" onClick={acceptConfirm}>
                        {dialog.options.confirmLabel || "Confirmar"}
                      </button>
                    ) : (
                      <button type="button" className="btn-primary" onClick={acceptConfirm}>
                        {dialog.options.confirmLabel || "Confirmar"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}
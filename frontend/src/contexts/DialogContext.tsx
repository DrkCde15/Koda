import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ReactNode } from "react";

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cancel();
          }}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-gray-800">
            <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
              {dialog.options.title}
            </h2>

            {dialog.kind === "prompt" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitPrompt();
                }}
              >
                {dialog.options.description && (
                  <p className="mb-3 text-sm text-gray-500 dark:text-gray-300">
                    {dialog.options.description}
                  </p>
                )}
                <div className="space-y-3">
                  {dialog.options.fields.map((field, idx) => (
                    <label key={field.name} className="block">
                      <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
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
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" className="btn-ghost" onClick={cancel}>
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
                  <p className="mb-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {dialog.options.message}
                  </p>
                )}
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" className="btn-ghost" onClick={cancel}>
                    {dialog.options.cancelLabel || "Cancelar"}
                  </button>
                  <button
                    type="button"
                    className={
                      dialog.options.danger
                        ? "rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                        : "btn-primary"
                    }
                    onClick={acceptConfirm}
                  >
                    {dialog.options.confirmLabel || "Confirmar"}
                  </button>
                </div>
              </>
            )}
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

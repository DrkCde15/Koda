import { createContext, useCallback, useContext, useState } from "react";
import { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  push: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

const STYLES: Record<ToastType, { ring: string; icon: string; bar: string }> = {
  success: {
    ring: "border-emerald-500/25",
    icon: "text-emerald-500",
    bar: "bg-gradient-to-br from-emerald-400 to-teal-500",
  },
  error: {
    ring: "border-red-500/25",
    icon: "text-red-500",
    bar: "bg-gradient-to-br from-red-400 to-rose-500",
  },
  info: {
    ring: "border-brand-500/25",
    icon: "text-brand-500",
    bar: "bg-brand-gradient",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = ++counter;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => remove(id), 4500);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed top-5 right-5 z-[60] flex w-[min(92vw,380px)] flex-col gap-3"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            onClick={() => remove(t.id)}
            className={`glass animate-toast-in pointer-events-auto relative cursor-pointer overflow-hidden rounded-2xl p-4 pr-9 shadow-float ${STYLES[t.type].ring}`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${STYLES[t.type].icon} bg-[var(--koda-surface-2)]`}
              >
                {t.type === "success" ? (
                  <Icon name="check" />
                ) : t.type === "error" ? (
                  <Icon name="x" />
                ) : (
                  <Icon name="bell" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-tight text-[var(--koda-text)]">
                  {t.type === "success"
                    ? "Tudo certo"
                    : t.type === "error"
                    ? "Algo deu errado"
                    : "Koda"}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-[var(--koda-text-muted)]">{t.message}</p>
              </div>
              <span
                aria-hidden
                className={`absolute top-0 left-0 h-full w-1 ${STYLES[t.type].bar}`}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
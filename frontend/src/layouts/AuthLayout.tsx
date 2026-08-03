import { ReactNode } from "react";
import { Link } from "react-router-dom";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-50 p-4 text-zinc-800 dark:bg-[#0b0f19] dark:text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgb(99_102_241/0.12),transparent)]"
      />
      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center">
          <img src="/logo.png" alt="Koda" className="h-12 w-auto" />
        </Link>
        <div className="animate-scale-in rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-soft-lg dark:border-zinc-800 dark:bg-surface-dark">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Koda — workspace de produtividade
        </p>
      </div>
    </div>
  );
}

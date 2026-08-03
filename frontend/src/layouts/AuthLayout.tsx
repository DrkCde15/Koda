import { ReactNode } from "react";
import { Link } from "react-router-dom";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="aurora relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--koda-bg)] p-4 text-[var(--koda-text)]">
      {/* Ambient orbs */}
      <span aria-hidden className="aurora-orb left-[8%] top-[12%] h-72 w-72 bg-brand-500/30" />
      <span aria-hidden className="aurora-orb right-[6%] top-[38%] h-80 w-80 bg-violet-500/25" />
      <span aria-hidden className="aurora-orb bottom-[6%] left-[30%] h-64 w-64 bg-fuchsia-500/20" />

      {/* Grid backdrop */}
      <span aria-hidden className="bg-grid pointer-events-none absolute inset-0 opacity-70" />

      {/* Floating glass shards */}
      <div aria-hidden className="animate-float pointer-events-none absolute right-[12%] top-[20%] hidden rounded-3xl border border-white/10 bg-white/20 p-4 shadow-float backdrop-blur-md dark:bg-white/5 lg:block">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white">✓</span>
          <div>
            <p className="text-xs font-semibold text-[var(--koda-text)]">Organize tudo</p>
            <p className="text-[10px] text-[var(--koda-text-muted)]">páginas, bancos, arquivos</p>
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="animate-float pointer-events-none absolute left-[8%] bottom-[22%] hidden rounded-2xl border border-white/10 bg-white/20 px-4 py-3 shadow-float backdrop-blur-md md:block"
        style={{ animationDelay: "-3.5s" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f1118]/90 text-sm">🚀</span>
          <span className="text-xs font-medium text-[var(--koda-text)]">+2 páginas hoje</span>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="animate-fade-down mb-8 flex flex-col items-center gap-3">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[var(--koda-bg)] shadow-float transition-transform duration-300 group-hover:scale-105">
              <img src="/logo.png?v=3" alt="" className="h-10 w-10 object-contain" />
            </span>
            <span className="text-2xl font-bold tracking-tight text-[var(--koda-text)]">
              Koda
            </span>
          </Link>
        </div>

        <div className="animate-blur-in relative rounded-3xl border border-[var(--koda-border)] bg-[var(--koda-surface)]/80 p-8 shadow-float backdrop-blur-xl" style={{ animationDelay: "80ms" }}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgb(var(--koda-glow) / 0.7), transparent)",
            }}
          />
          <div className="animate-fade-up [animation-delay:160ms]">{children}</div>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--koda-text-faint)]">
          Feito para equipes que pensam em grande.
        </p>
      </div>
    </div>
  );
}
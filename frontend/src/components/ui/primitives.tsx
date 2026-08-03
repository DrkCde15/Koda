import { useEffect, useRef, useState } from "react";

/** Observe when an element enters the viewport (once). */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: { threshold?: number; rootMargin?: string; once?: boolean } = {}
): { ref: React.RefObject<T | null>; inView: boolean } {
  const { threshold = 0.15, rootMargin = "0px 0px -40px 0px", once = true } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        });
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView };
}

/** Fade + slide-in reveal with optional stagger delay (respects reduced motion). */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article" | "span" | "h2" | "h3" | "p" | "tr";
}) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <Tag
      ref={ref as never}
      className={`reveal-elem ${inView ? "is-visible" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

/** Count-up number that animates when scrolled into view. */
export function AnimatedNumber({
  value,
  duration = 1200,
  className = "",
  format,
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const from = 0;
    const to = value;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [inView, value, duration]);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const rendered = prefersReduced || !inView ? value : display;
  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>} className={className}>
      {format ? format(rendered) : Math.round(rendered).toLocaleString("pt-BR")}
    </span>
  );
}

/** CSS-only skeleton block used while data loads. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

/** Full-page (route) loading shimmer. */
export function RouteLoader({ label = "Carregando" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-[var(--koda-border)]" />
        <div className="animate-spin absolute inset-0 rounded-full border-2 border-transparent border-t-brand-500" />
        <div className="absolute inset-[14px] rounded-full bg-brand-gradient opacity-80" />
      </div>
      <p className="animate-pulse-soft text-sm text-[var(--koda-text-muted)]">{label}…</p>
    </div>
  );
}
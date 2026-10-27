import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../utils/cn";

/* ---------------- count-up animation ---------------- */

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useCountUp(target: number | null, ms = 900): number | null {
  const [val, setVal] = useState<number | null>(null);
  const prev = useRef<number>(0);

  useEffect(() => {
    if (target == null) {
      setVal(null);
      return;
    }
    if (prefersReduced()) {
      setVal(target);
      prev.current = target;
      return;
    }
    const from = prev.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / ms, 1);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setVal(from + (target - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return val;
}

/* ---------------- reveal on scroll ---------------- */

export function useInView<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced()) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "-8% 0px", threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, inView } as const;
}

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn("reveal", inView && "on", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------------- clock ---------------- */

export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

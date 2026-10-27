import { useCallback, useEffect, useRef, useState } from "react";

export interface SpotRates {
  bcvUsd: number | null;
  parUsd: number | null;
  bcvEur: number | null;
  parEur: number | null;
  /** Binance P2P: promedio de las mejores ofertas USDT/VES (Bs por USDT) */
  binance: number | null;
  updatedAt: string; // ISO
  origin: "live" | "cache";
}

export type RateStatus = "loading" | "live" | "cache" | "error";

const CACHE_KEY = "tasaaldia.rates.v3";
const MANUAL_KEY = "tasaaldia.manual.v2";
const TIMEOUT = 9000;
const REFRESH_EVERY = 10 * 60 * 1000;
const MIN_GAP = 45 * 1000;

/* ------------------------------------------------------------------ */
/*  Tasas de referencia editables (PayPal / Zelle / Personalizada)     */
/* ------------------------------------------------------------------ */

export interface ManualRates {
  personalizada: string;
}

export function loadManual(): ManualRates {
  try {
    const raw = localStorage.getItem(MANUAL_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<ManualRates>) : {};
    return { personalizada: parsed.personalizada ?? "" };
  } catch {
    return { personalizada: "" };
  }
}

export function saveManual(m: ManualRates) {
  try {
    localStorage.setItem(MANUAL_KEY, JSON.stringify(m));
  } catch {
    /* noop */
  }
}

/* ------------------------------------------------------------------ */
/*  Fuentes externas                                                   */
/* ------------------------------------------------------------------ */

interface DolarApiEntry {
  moneda: string;
  fuente: string;
  promedio: number | null;
}

async function getJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

const pick = (arr: DolarApiEntry[] | undefined, fuente: string): number | null =>
  arr?.find((e) => e.fuente === fuente)?.promedio ?? null;

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/* --- Binance P2P: fuente 1 — API pública en vivo (igual que alcambio.app) --- */
async function binanceLive(): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          asset: "USDT",
          fiat: "VES",
          tradeType: "BUY",
          page: 1,
          rows: 5,
          payTypes: [],
        }),
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { adv?: { price?: string } }[] };
    const prices = (json.data ?? [])
      .map((d) => parseFloat(d?.adv?.price ?? ""))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!prices.length) return null;
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* --- Binance P2P: fuente 2 — espejo GitHub actualizado cada 30 min --- */
async function binanceMirrorA(): Promise<number | null> {
  try {
    const j = await getJson<{
      ves_por_usdt_mercado?: { ves_por_usdt?: string };
    }>("https://raw.githubusercontent.com/mi-url/tasas-venezuela/main/tasas.json");
    return num(j?.ves_por_usdt_mercado?.ves_por_usdt);
  } catch {
    return null;
  }
}

/* --- Binance P2P: fuente 3 — espejo GitHub actualizado cada hora --- */
async function binanceMirrorB(): Promise<number | null> {
  try {
    const j = await getJson<{ usdt?: number; usdt_promedio_compra?: number }>(
      "https://raw.githubusercontent.com/JCZR2000/ComercioPrecioAPI/main/tasas_cambio.json"
    );
    return num(j?.usdt_promedio_compra) ?? num(j?.usdt);
  } catch {
    return null;
  }
}

async function fetchBinance(): Promise<number | null> {
  return (
    (await binanceLive()) ?? (await binanceMirrorA()) ?? (await binanceMirrorB())
  );
}

export async function fetchSpotRates(): Promise<SpotRates> {
  const [usd, eur, bin] = await Promise.allSettled([
    getJson<DolarApiEntry[]>("https://ve.dolarapi.com/v1/dolares"),
    getJson<DolarApiEntry[]>("https://ve.dolarapi.com/v1/euros"),
    fetchBinance(),
  ]);

  const dollars = usd.status === "fulfilled" ? usd.value : undefined;
  const euros = eur.status === "fulfilled" ? eur.value : undefined;
  const binance = bin.status === "fulfilled" ? bin.value : null;

  const r: SpotRates = {
    bcvUsd: pick(dollars, "oficial"),
    parUsd: pick(dollars, "paralelo"),
    bcvEur: pick(euros, "oficial"),
    parEur: pick(euros, "paralelo"),
    binance,
    updatedAt: new Date().toISOString(),
    origin: "live",
  };

  if (r.bcvUsd == null && r.parUsd == null && r.binance == null) {
    throw new Error("sin datos");
  }
  return r;
}

/* ------------------------------------------------------------------ */
/*  Caché                                                              */
/* ------------------------------------------------------------------ */

export function loadCache(): SpotRates | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<SpotRates>;
    const rates: SpotRates = {
      bcvUsd: p.bcvUsd ?? null,
      parUsd: p.parUsd ?? null,
      bcvEur: p.bcvEur ?? null,
      parEur: p.parEur ?? null,
      binance: p.binance ?? null,
      updatedAt: p.updatedAt ?? new Date().toISOString(),
      origin: "cache",
    };
    if (rates.bcvUsd == null && rates.parUsd == null && rates.binance == null) return null;
    return rates;
  } catch {
    return null;
  }
}

function saveCache(r: SpotRates) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...r, origin: "cache" }));
  } catch {
    /* noop */
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export interface SpotState {
  rates: SpotRates | null;
  status: RateStatus;
  refreshing: boolean;
  refresh: () => void;
}

export function useSpotRates(): SpotState {
  const [rates, setRates] = useState<SpotRates | null>(null);
  const [status, setStatus] = useState<RateStatus>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);
  const lastRun = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const refresh = useCallback(async (force = true) => {
    const now = Date.now();
    if (!force && now - lastRun.current < MIN_GAP) return;
    lastRun.current = now;
    setRefreshing(true);
    try {
      const live = await fetchSpotRates();
      if (!alive.current) return;
      saveCache(live);
      setRates(live);
      setStatus("live");
    } catch {
      if (!alive.current) return;
      const cached = loadCache();
      if (cached) {
        setRates(cached);
        setStatus("cache");
      } else {
        setStatus((s) => (s === "loading" ? "error" : s));
      }
    } finally {
      if (alive.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setRates(cached);
      setStatus("cache");
    }
    void refresh(true);

    // se actualiza sola: cada 10 min y cada vez que vuelves a la pestaña
    const id = setInterval(() => void refresh(false), REFRESH_EVERY);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return { rates, status, refreshing, refresh: () => void refresh(true) };
}

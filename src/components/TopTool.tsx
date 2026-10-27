import { useState, useEffect } from "react";
import { RefreshCw, ArrowUpDown, Copy, Check, PenLine } from "lucide-react";
import { useCountUp } from "../hooks/hooks";
import { fmt2, fmtMax2, money, parseVE, timeHM, shortDate, type Currency } from "../lib/fmt";
import { loadManual, saveManual, type ManualRates, type SpotRates, type SpotState } from "../lib/rates";
import { cn } from "../utils/cn";

type RateKey = "bcv" | "promedio" | "binance" | "euro" | "personalizada";

const PILLS: { k: RateKey; t: string }[] = [
  { k: "bcv", t: "BCV oficial" },
  { k: "promedio", t: "Tasa promedio" },
  { k: "binance", t: "Binance" },
  { k: "euro", t: "Euro BCV" },
  { k: "personalizada", t: "Personalizada" },
];

const RATE_NAME: Record<RateKey, string> = {
  bcv: "Dólar BCV",
  promedio: "Tasa promedio",
  binance: "Binance P2P · USDT",
  euro: "Euro BCV",
  personalizada: "Tasa personalizada",
};

const RATE_NOTE: Partial<Record<RateKey, string>> = {
  promedio: "Promedio entre el paralelo y Binance P2P",
  binance: "Promedio de las mejores ofertas USDT/VES del P2P",
  personalizada: "Tu propia tasa en Bs por cada $1",
};

const CHIPS = ["1", "5", "10", "20", "50", "100"];

/** Promedio del mercado: media entre paralelo y Binance P2P (los que estén disponibles) */
export function promedio(rates: SpotRates | null): number | null {
  const vals = [rates?.parUsd, rates?.binance].filter((x): x is number => x != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function Field({
  label,
  symbol,
  value,
  placeholder,
  onChange,
  big,
  accent,
}: {
  label: string;
  symbol: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  big?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-ink-900 p-4",
        accent ? "border-gold-400/40" : "border-white/[0.08]"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/45">{label}</span>
        <span
          className={cn(
            "flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-xs font-bold",
            accent ? "bg-gold-400 text-ink-950" : "bg-ink-700 text-white/70"
          )}
        >
          {symbol}
        </span>
      </div>
      <input
        className={cn(
          "num mt-1 w-full bg-transparent font-bold outline-none placeholder:text-white/20",
          big ? "text-3xl sm:text-[2.6rem]" : "text-2xl",
          accent ? "text-gold-400" : "text-white"
        )}
        inputMode="decimal"
        placeholder={placeholder ?? "0,00"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
    </div>
  );
}

export default function TopTool({ spot }: { spot: SpotState }) {
  const { rates, status, refreshing, refresh } = spot;
  const [key, setKey] = useState<RateKey>("bcv");
  const [manual, setManual] = useState<ManualRates>(loadManual);
  const [aStr, setAStr] = useState("1"); // divisas / usdt / euro
  const [bStr, setBStr] = useState(""); // bolívares
  const [last, setLast] = useState<"a" | "b">("a");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    saveManual(manual);
  }, [manual]);

  const isManual = key === "personalizada";
  const isUsdt = key === "binance";
  const isEur = key === "euro";
  const unit = isUsdt ? "USDT" : isEur ? "€" : "$";
  const labelA = isUsdt ? "USDT" : isEur ? "Euros" : "Dólares";
  const outCur: Currency = isEur ? "EUR" : "USD";

  /* ---------- tasa activa ---------- */
  let rate: number | null = null;
  if (isManual) {
    const v = parseVE(manual.personalizada);
    rate = Number.isFinite(v) && v > 0 ? v : null;
  } else if (key === "bcv") {
    rate = rates?.bcvUsd ?? null;
  } else if (key === "promedio") {
    rate = promedio(rates);
  } else if (key === "binance") {
    rate = rates?.binance ?? null;
  } else {
    rate = rates?.bcvEur ?? null;
  }

  const priceAnim = useCountUp(rate, 900);

  /* ---------- conversión (campo A ↔ campo B) ---------- */
  const aParsed = parseVE(aStr);
  const bParsed = parseVE(bStr);
  const aNum = Number.isFinite(aParsed) ? aParsed : null;
  const bNum = Number.isFinite(bParsed) ? bParsed : null;

  const showVal = (n: number) =>
    n > 0 && n < 1 ? n.toFixed(4).replace(".", ",") : fmtMax2(n);

  const bFromA = rate != null && aNum != null ? aNum * rate : null; // divisas → Bs
  const aFromB = rate != null && bNum != null ? bNum / rate : null; // Bs → divisas

  const aValue = last === "a" ? aStr : aFromB != null ? showVal(aFromB) : "";
  const bValue = last === "b" ? bStr : bFromA != null ? showVal(bFromA) : "";

  const badge = {
    live: { color: "bg-emerald-400", text: "Actualizada" },
    cache: { color: "bg-gold-400", text: "Última guardada" },
    error: { color: "bg-red-400", text: "Sin conexión" },
    loading: { color: "bg-white/40", text: "Consultando…" },
  }[status];

  const infoCards = [
    { label: "Dólar paralelo", v: rates?.parUsd ?? null },
    { label: "Euro paralelo", v: rates?.parEur ?? null },
  ];

  const copyResult = async () => {
    const isBs = last === "a";
    const n = isBs ? bFromA : aFromB;
    if (n == null) return;
    const text = money(n, isBs ? "VES" : outCur);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section id="inicio" className="relative">
      <div className="mx-auto max-w-xl px-5 pt-8 pb-4 sm:pt-12">
        {/* ============ 1 · PRECIO DE HOY ============ */}
        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <span className={cn("live-dot relative h-2 w-2 rounded-full", badge.color)} />
              <span className="num text-[11px] font-bold uppercase tracking-[0.22em] text-gold-400">
                {RATE_NAME[key]} · hoy
              </span>
            </span>
            <button
              onClick={refresh}
              aria-label="Actualizar tasa"
              className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-gold-300"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </button>
          </div>

          {/* selector de tasa */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {PILLS.map((p) => (
              <button
                key={p.k}
                onClick={() => setKey(p.k)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-bold transition-all sm:px-3.5 sm:text-xs",
                  key === p.k
                    ? "bg-gold-400 text-ink-950"
                    : "border border-white/10 bg-white/[0.04] text-white/55 hover:border-gold-400/50 hover:text-gold-300"
                )}
              >
                {p.t}
              </button>
            ))}
          </div>

          {/* input tasa personalizada */}
          {isManual && (
            <div className="rise mt-4 rounded-2xl border border-dashed border-gold-400/35 bg-gold-400/[0.06] p-3.5">
              <label className="num mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gold-300">
                <PenLine className="h-3 w-3" />
                Tu tasa en Bs por cada $1
              </label>
              <input
                className="field num !bg-ink-900"
                inputMode="decimal"
                placeholder="Ej: 970,00"
                value={manual.personalizada}
                onChange={(e) => setManual({ personalizada: e.target.value })}
              />
            </div>
          )}

          {/* el número gigante */}
          <div className="mt-5">
            {priceAnim == null ? (
              isManual ? (
                <p className="num text-xl font-bold text-white/30">
                  Escribe tu tasa arriba y aparece aquí
                </p>
              ) : status === "error" ? (
                <p className="num text-xl font-bold text-white/30">
                  Sin conexión — toca actualizar
                </p>
              ) : (
                <div className="shimmer h-[66px] w-4/5 rounded-2xl bg-white/[0.05]" />
              )
            ) : (
              <p
                className="num flash flex flex-wrap items-baseline gap-x-3"
                key={`${key}-${(rate ?? 0).toFixed(2)}`}
              >
                <span className="text-2xl font-bold text-white/40 sm:text-3xl">Bs</span>
                <span className="text-[3.6rem] font-extrabold leading-none tracking-tight text-gold-400 sm:text-7xl">
                  {fmt2(priceAnim)}
                </span>
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <p className="num text-[11px] uppercase tracking-[0.18em] text-white/35">
                por 1 {unit} ·{" "}
                {isManual
                  ? "referencial"
                  : `${badge.text}${rates ? ` · ${shortDate()} ${timeHM(rates.updatedAt)}` : ""}`}
              </p>
            </div>
            {RATE_NOTE[key] && (
              <p className="mt-1.5 text-[11px] text-white/30">{RATE_NOTE[key]}</p>
            )}
          </div>
        </div>

        {/* ============ 2 · CALCULADORA DE DIVISAS ============ */}
        <div className="glass mt-4 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between px-1 pb-4">
            <h2 className="text-sm font-bold text-white/85">Calculadora</h2>
            <span className="text-[11px] text-white/35">Escribe en cualquiera de los dos</span>
          </div>

          <Field
            label={labelA}
            symbol={unit}
            value={aValue}
            onChange={(v) => {
              setLast("a");
              setAStr(v);
            }}
          />

          <div className="relative z-10 -my-4 flex justify-center">
            <button
              onClick={() => {
                setLast((l) => (l === "a" ? "b" : "a"));
                if (last === "a") setBStr(bFromA != null ? showVal(bFromA) : "");
                else setAStr(aFromB != null ? showVal(aFromB) : "");
              }}
              aria-label="Intercambiar dirección"
              className="rounded-full border-4 border-ink-950 bg-gold-400 p-2 text-ink-950 shadow-[0_8px_20px_-6px_rgba(255,201,23,0.6)] transition-transform duration-300 hover:scale-110 active:scale-95"
            >
              <ArrowUpDown className="h-4 w-4" strokeWidth={2.8} />
            </button>
          </div>

          <Field
            label="Bolívares"
            symbol="Bs"
            value={bValue}
            onChange={(v) => {
              setLast("b");
              setBStr(v);
            }}
            placeholder={rate == null ? "Esperando la tasa…" : "0,00"}
            big
            accent
          />

          {/* montos rápidos */}
          <div className="mt-4 grid grid-cols-6 gap-1.5">
            {CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setLast("a");
                  setAStr(c);
                }}
                className={cn(
                  "num rounded-lg border py-2 text-xs font-bold transition-colors",
                  aValue === c && last === "a"
                    ? "border-gold-400/60 bg-gold-400/15 text-gold-300"
                    : "border-white/[0.08] bg-white/[0.03] text-white/50 hover:border-gold-400/40 hover:text-gold-300"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {/* tasa usada + copiar */}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
            <p className="num text-[11px] font-medium text-white/40">
              1 {unit} = Bs {rate != null ? fmt2(rate) : "—"} · {RATE_NAME[key]}
            </p>
            <button
              onClick={copyResult}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold transition-all",
                copied
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  : "border-white/10 bg-white/[0.04] text-white/65 hover:border-gold-400/50 hover:text-gold-300"
              )}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>

        {/* ============ 3 · REFERENCIAS EXTRA ============ */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {infoCards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-white/[0.07] bg-ink-800 p-3.5">
              <p className="num text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
                {c.label}
              </p>
              {c.v == null ? (
                <div className="shimmer mt-2 h-5 w-16 rounded bg-white/[0.06]" />
              ) : (
                <p className="num mt-1.5 text-sm font-bold text-white sm:text-base">
                  Bs {fmt2(c.v)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

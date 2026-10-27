import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Plus,
  Trash2,
  MessageCircle,
  Copy,
  Check,
  RotateCcw,
  ReceiptText,
  Smartphone,
  IdCard,
  SlidersHorizontal,
} from "lucide-react";
import SectionHead from "./SectionHead";
import { promedio } from "./TopTool";
import { Reveal, useCountUp } from "../hooks/hooks";
import {
  buildQuoteText,
  computeTotals,
  fmt2,
  fmtMax2,
  makeSerial,
  money,
  parseVE,
  shortDate,
  uid,
  waUrl,
  type QuoteLine,
  type QuotePayload,
} from "../lib/fmt";
import type { SpotState } from "../lib/rates";
import { cn } from "../utils/cn";

interface UiItem {
  id: string;
  desc: string;
  qty: string;
  price: string;
}

interface QState {
  pro: string;
  client: string;
  phone: string;
  validity: number;
  currency: "USD" | "VES";
  rateKey: "bcv" | "promedio" | "binance" | "personalizada";
  customRate: string;
  iva: boolean;
  igtf: boolean;
  discount: string;
  items: UiItem[];
}

const STORE = "tasaaldia.quote.v1";

const newRow = (): UiItem => ({ id: uid(), desc: "", qty: "1", price: "" });

const defaults: QState = {
  pro: "",
  client: "",
  phone: "",
  validity: 7,
  currency: "USD",
  rateKey: "bcv",
  customRate: "",
  iva: true,
  igtf: false,
  discount: "0",
  items: [newRow()],
};

function loadState(): QState {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<QState>;
    const merged = { ...defaults, ...parsed, items: parsed.items?.length ? parsed.items : [newRow()] };
    if (!["bcv", "promedio", "binance", "personalizada"].includes(merged.rateKey)) merged.rateKey = "bcv";
    return merged;
  } catch {
    return defaults;
  }
}

/* ---------------- piezas reutilizables ---------------- */

function Step({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5 pt-1">
      <span className="num flex h-6 w-6 items-center justify-center rounded-lg border border-gold-400/30 bg-gold-400/10 text-[10px] font-bold text-gold-300">
        {n}
      </span>
      <span className="num text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">{title}</span>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="num mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
      {children}
    </label>
  );
}

function Switch({
  on,
  onToggle,
  label,
  desc,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
  desc?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-white/15"
    >
      <span>
        <span className="block text-[13px] font-semibold text-white/85">{label}</span>
        {desc && <span className="mt-0.5 block text-[11px] text-white/40">{desc}</span>}
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300",
          on ? "bg-gold-400" : "bg-white/10"
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] h-[18px] w-[18px] rounded-full transition-all duration-300",
            on ? "left-[22px] bg-ink-950" : "left-[3px] bg-white/50"
          )}
        />
      </span>
    </button>
  );
}

/* ---------------- componente principal ---------------- */

export default function Quoter({ spot }: { spot: SpotState }) {
  const [q, setQ] = useState<QState>(loadState);
  const [serial, setSerial] = useState(() => makeSerial());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(q));
    } catch {
      /* noop */
    }
  }, [q]);

  const patch = (p: Partial<QState>) => setQ((v) => ({ ...v, ...p }));
  const patchItem = (id: string, p: Partial<UiItem>) =>
    setQ((v) => ({ ...v, items: v.items.map((it) => (it.id === id ? { ...it, ...p } : it)) }));
  const removeItem = (id: string) =>
    setQ((v) => ({ ...v, items: v.items.length > 1 ? v.items.filter((it) => it.id !== id) : v.items }));

  const rateInfo = useMemo(() => {
    let rate: number | null = null;
    let label = "BCV";
    if (q.rateKey === "bcv") {
      rate = spot.rates?.bcvUsd ?? null;
      label = "BCV";
    } else if (q.rateKey === "promedio") {
      rate = promedio(spot.rates);
      label = "Tasa promedio";
    } else if (q.rateKey === "binance") {
      rate = spot.rates?.binance ?? null;
      label = "Binance";
    } else {
      const v = parseVE(q.customRate);
      rate = Number.isFinite(v) && v > 0 ? v : null;
      label = "Personalizada";
    }
    return { rate, label };
  }, [q.rateKey, q.customRate, spot.rates]);

  const lines: QuoteLine[] = useMemo(
    () =>
      q.items.map((i) => ({
        desc: i.desc.trim(),
        qty: parseVE(i.qty) || 0,
        price: parseVE(i.price) || 0,
      })),
    [q.items]
  );

  const payload: QuotePayload = {
    serial,
    pro: q.pro.trim(),
    client: q.client.trim(),
    validity: q.validity,
    currency: q.currency,
    lines: lines.filter((l) => l.desc || l.price > 0),
    applyIva: q.iva,
    applyIgtf: q.igtf,
    discountPct: parseVE(q.discount) || 0,
    rate: rateInfo.rate,
    rateLabel: rateInfo.label,
  };

  const totals = computeTotals(payload);
  const quoteText = useMemo(() => buildQuoteText(payload, totals), [JSON.stringify(payload), JSON.stringify(totals)]);
  const totalAnim = useCountUp(totals.total, 500);

  const curSym = q.currency === "USD" ? "$" : "Bs";
  const visibleLines = payload.lines;

  const copyQuote = async () => {
    try {
      await navigator.clipboard.writeText(quoteText);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = quoteText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const sendWhatsApp = () => {
    window.open(waUrl(q.phone, quoteText), "_blank", "noopener");
  };

  const newQuote = () => {
    setSerial(makeSerial());
    setQ((v) => ({ ...v, client: "", phone: "", discount: "0", items: [newRow()] }));
  };

  return (
    <section id="cotizador" className="relative scroll-mt-20">
      <div className="mx-auto max-w-xl px-5 pb-16 pt-10">
        <SectionHead
          icon={ReceiptText}
          eyebrow="Cotizador universal"
          title="Cotiza y envía por WhatsApp en segundos."
          desc="Perfecto para técnicos, profesionales y freelancers: agrega tus servicios, súmale IVA e IGTF si aplica, y envíale al cliente una cotización elegante por WhatsApp."
        />

        <div className="space-y-5">
          {/* ================= FORMULARIO ================= */}
          <Reveal className="glass rounded-3xl p-5 sm:p-7">
            {/* 01 Identidad */}
            <Step n="01" title="Identidad" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>Tu nombre o empresa</FieldLabel>
                <div className="relative">
                  <IdCard className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                  <input
                    className="field !pl-10"
                    placeholder="Ej: Servicios Técnicos Ríos"
                    value={q.pro}
                    onChange={(e) => patch({ pro: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Cliente</FieldLabel>
                <input
                  className="field"
                  placeholder="Nombre del cliente"
                  value={q.client}
                  onChange={(e) => patch({ client: e.target.value })}
                />
              </div>
            </div>

            {/* 02 Servicios */}
            <div className="mt-7">
              <Step n="02" title="Servicios y honorarios" />
            </div>
            <div className="mt-4 space-y-3">
              {q.items.map((it, i) => {
                const lineTotal = (parseVE(it.qty) || 0) * (parseVE(it.price) || 0);
                return (
                  <div
                    key={it.id}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5 transition-colors hover:border-white/[0.14]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="num w-5 shrink-0 text-xs font-bold text-gold-400/70">{i + 1}.</span>
                      <input
                        className="field"
                        placeholder="Descripción del servicio: instalación, reparación, asesoría…"
                        value={it.desc}
                        onChange={(e) => patchItem(it.id, { desc: e.target.value })}
                      />
                      <button
                        onClick={() => removeItem(it.id)}
                        aria-label="Eliminar servicio"
                        className="shrink-0 rounded-lg p-2 text-white/30 transition-colors hover:bg-red-400/10 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2.5 grid grid-cols-[74px_1fr_auto] items-center gap-2 pl-7">
                      <input
                        className="field num !px-2 text-center"
                        inputMode="decimal"
                        aria-label="Cantidad"
                        placeholder="Cant."
                        value={it.qty}
                        onChange={(e) => patchItem(it.id, { qty: e.target.value })}
                      />
                      <div className="relative">
                        <span className="num pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gold-300/80">
                          {curSym}
                        </span>
                        <input
                          className="field num !pl-9"
                          inputMode="decimal"
                          aria-label="Precio unitario"
                          placeholder="Precio unitario"
                          value={it.price}
                          onChange={(e) => patchItem(it.id, { price: e.target.value })}
                        />
                      </div>
                      <span className="num w-24 truncate text-right text-xs font-bold text-gold-300">
                        {money(lineTotal, q.currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => patch({ items: [...q.items, newRow()] })}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-3.5 text-sm font-semibold text-white/50 transition-colors hover:border-gold-400/50 hover:text-gold-300"
              >
                <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                Agregar servicio
              </button>
            </div>

            {/* 03 Ajustes */}
            <div className="mt-7">
              <Step n="03" title="Moneda, impuestos y condiciones" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>Moneda de la cotización</FieldLabel>
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
                  {(
                    [
                      ["USD", "Dólares ($)"],
                      ["VES", "Bolívares (Bs)"],
                    ] as ["USD" | "VES", string][]
                  ).map(([c, t]) => (
                    <button
                      key={c}
                      onClick={() => patch({ currency: c })}
                      className={cn(
                        "rounded-lg py-2.5 text-xs font-bold transition-all duration-300",
                        q.currency === c
                          ? "bg-gold-400 text-ink-950 shadow-[0_6px_16px_-6px_rgba(246,192,75,0.6)]"
                          : "text-white/45 hover:text-white"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-end justify-between">
                  <FieldLabel>Tasa de referencia</FieldLabel>
                  <span className="num mb-1.5 text-[10px] font-bold text-gold-300">
                    {rateInfo.rate ? `Bs ${fmt2(rateInfo.rate)}` : "—"}
                  </span>
                </div>
                <select
                  className="field"
                  value={q.rateKey}
                  onChange={(e) => patch({ rateKey: e.target.value as QState["rateKey"] })}
                >
                  <option value="bcv">BCV del día</option>
                  <option value="promedio">Tasa promedio</option>
                  <option value="binance">Binance (USDT)</option>
                  <option value="personalizada">Personalizada</option>
                </select>
                {q.rateKey === "personalizada" && (
                  <input
                    className="field num rise mt-2"
                    inputMode="decimal"
                    placeholder="Tu tasa: 895,50"
                    value={q.customRate}
                    onChange={(e) => patch({ customRate: e.target.value })}
                  />
                )}
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Switch
                on={q.iva}
                onToggle={() => patch({ iva: !q.iva })}
                label="IVA 16%"
                desc="Impuesto al valor agregado"
              />
              <Switch
                on={q.igtf}
                onToggle={() => patch({ igtf: !q.igtf })}
                label="IGTF 3%"
                desc="Pagos en divisas"
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>Descuento (%)</FieldLabel>
                <input
                  className="field num"
                  inputMode="decimal"
                  placeholder="0"
                  value={q.discount}
                  onChange={(e) => patch({ discount: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel>Válida por (días)</FieldLabel>
                <input
                  className="field num"
                  type="number"
                  min={1}
                  max={90}
                  value={q.validity}
                  onChange={(e) => patch({ validity: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>
            </div>

            {/* 04 WhatsApp */}
            <div className="mt-7">
              <Step n="04" title="Destino" />
            </div>
            <div className="mt-4">
              <FieldLabel>WhatsApp del cliente (opcional)</FieldLabel>
              <div className="relative">
                <Smartphone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                <input
                  className="field num !pl-10"
                  inputMode="tel"
                  placeholder="0412 555 55 55 ó 58412…"
                  value={q.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/35">
                <SlidersHorizontal className="h-3 w-3" />
                Si lo dejas vacío, eliges el contacto al abrir WhatsApp.
              </p>
            </div>
          </Reveal>

          {/* ================= VISTA PREVIA ================= */}
          <Reveal delay={120}>
            <div className="paper relative overflow-hidden rounded-[22px] p-6 shadow-2xl sm:p-8">
              {/* línea dorada superior */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300" />

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="num text-[10px] font-bold uppercase tracking-[0.3em] text-[#a08c4f]">
                    Cotización
                  </p>
                  <h3 className="font-display mt-1 text-xl font-bold leading-tight text-paper-ink">
                    {q.pro || "Tu nombre o empresa"}
                  </h3>
                </div>
                <span className="num shrink-0 rounded-lg border border-[#e0d5b8] bg-[#f4ecd9] px-2.5 py-1 text-[10px] font-bold text-[#7a6527]">
                  {serial}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 divide-x divide-paper-line rounded-xl border border-paper-line bg-white/50 text-center">
                <div className="px-2 py-2.5">
                  <p className="num text-[8.5px] font-bold uppercase tracking-[0.18em] text-[#a9955f]">Cliente</p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-paper-ink">{q.client || "—"}</p>
                </div>
                <div className="px-2 py-2.5">
                  <p className="num text-[8.5px] font-bold uppercase tracking-[0.18em] text-[#a9955f]">Fecha</p>
                  <p className="num mt-0.5 text-[11px] font-semibold text-paper-ink">{shortDate()}</p>
                </div>
                <div className="px-2 py-2.5">
                  <p className="num text-[8.5px] font-bold uppercase tracking-[0.18em] text-[#a9955f]">Vigencia</p>
                  <p className="num mt-0.5 text-[11px] font-semibold text-paper-ink">{q.validity} días</p>
                </div>
              </div>

              {/* tabla */}
              <div className="mt-5 overflow-hidden rounded-xl border border-paper-line">
                <div className="num grid grid-cols-[1fr_44px_76px_84px] gap-x-2 bg-[#efe7d2] px-3 py-2 text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#8d7a45]">
                  <span>Detalle</span>
                  <span className="text-right">Cant.</span>
                  <span className="text-right">P. Unit.</span>
                  <span className="text-right">Importe</span>
                </div>
                {visibleLines.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs italic text-[#a9955f]">
                    Agrega servicios en el formulario para verlos aquí
                  </p>
                ) : (
                  visibleLines.map((l, i) => (
                    <div
                      key={i}
                      className={cn(
                        "num grid grid-cols-[1fr_44px_76px_84px] gap-x-2 px-3 py-2.5 text-[11.5px] text-paper-ink",
                        i % 2 === 0 ? "bg-white/40" : "bg-[#faf5e8]"
                      )}
                    >
                      <span className="truncate font-medium">{l.desc || "Servicio"}</span>
                      <span className="text-right text-[#7d6f4a]">{fmtMax2(l.qty)}</span>
                      <span className="text-right text-[#7d6f4a]">{fmt2(l.price)}</span>
                      <span className="text-right font-bold">{fmt2(l.qty * l.price)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* totales */}
              <div className="mt-5 flex justify-end">
                <div className="w-full max-w-[250px] space-y-1.5 text-[12px]">
                  <div className="num flex justify-between text-[#5c5136]">
                    <span>Subtotal</span>
                    <span className="font-semibold">{money(totals.sub, q.currency)}</span>
                  </div>
                  {totals.dis > 0 && (
                    <div className="num flex justify-between text-[#5c5136]">
                      <span>Descuento ({fmtMax2(payload.discountPct)}%)</span>
                      <span className="font-semibold">−{money(totals.dis, q.currency)}</span>
                    </div>
                  )}
                  {q.iva && (
                    <div className="num flex justify-between text-[#5c5136]">
                      <span>IVA (16%)</span>
                      <span className="font-semibold">{money(totals.iva, q.currency)}</span>
                    </div>
                  )}
                  {q.igtf && (
                    <div className="num flex justify-between text-[#5c5136]">
                      <span>IGTF (3%)</span>
                      <span className="font-semibold">{money(totals.igtf, q.currency)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-xl bg-ink-950 px-4 py-3">
                    <span className="num text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                      Total
                    </span>
                    <span className="num text-lg font-bold text-gold-400">
                      {totalAnim != null ? money(totalAnim, q.currency) : money(0, q.currency)}
                    </span>
                  </div>
                  {totals.equiv != null && rateInfo.rate && (
                    <p className="num pt-1 text-right text-[10px] font-medium text-[#8d7a45]">
                      ≈ {money(totals.equiv, q.currency === "USD" ? "VES" : "USD")} · Tasa {rateInfo.label}{" "}
                      {fmtMax2(rateInfo.rate)} Bs/USD
                    </p>
                  )}
                </div>
              </div>

              <p className="num mt-6 border-t border-paper-line pt-4 text-[8.5px] font-semibold uppercase tracking-[0.22em] text-[#a9955f]">
                Montos sujetos a la tasa del día de pago · Tasa al Día VE
              </p>
            </div>

            {/* acciones */}
            <div className="mt-5">
              <button
                onClick={sendWhatsApp}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-b from-wa-400 to-wa-600 px-5 py-4 text-sm font-bold text-white shadow-[0_14px_36px_-10px_rgba(34,197,94,0.55)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <MessageCircle className="h-5 w-5" strokeWidth={2.2} />
                Enviar por WhatsApp
              </button>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <button
                  onClick={copyQuote}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition-all",
                    copied
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                      : "border-white/10 bg-white/[0.04] text-white/70 hover:border-gold-400/50 hover:text-gold-300"
                  )}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "¡Copiada!" : "Copiar texto"}
                </button>
                <button
                  onClick={newQuote}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold text-white/70 transition-colors hover:border-red-400/40 hover:text-red-300"
                >
                  <RotateCcw className="h-4 w-4" />
                  Nueva cotización
                </button>
              </div>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-white/35">
                El mensaje se abre en WhatsApp con el detalle completo, listo para enviar.
                Tus datos se guardan solo en este dispositivo.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

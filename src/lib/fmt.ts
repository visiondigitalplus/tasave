/* ---------------------------------------------------------------- */
/*  Formateo de números con convención venezolana (1.234.456,78)     */
/* ---------------------------------------------------------------- */

const f2 = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const f2Max = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const fmt2 = (n: number) => f2.format(n);
export const fmtMax2 = (n: number) => f2Max.format(n);

export type Currency = "USD" | "VES" | "EUR";

export const money = (n: number, cur: Currency) => {
  const sym = cur === "USD" ? "$" : cur === "EUR" ? "€" : "Bs";
  return `${sym} ${f2.format(n)}`;
};

/**
 * Parsea números escritos en formato venezolano o estándar:
 *  "1.234,56" → 1234.56 | "1234.56" → 1234.56 | "1234,56" → 1234.56
 *  ¡y miles con punto: "1.000" → 1000 (no 1)!
 */
export function parseVE(raw: string): number {
  const s = raw.trim().replace(/\s+/g, "").replace(/Bs|\$|€|USDT/gi, "");
  if (!s) return NaN;
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  let n: string = s;
  if (hasDot && hasComma) {
    n = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    n = s.replace(",", ".");
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    n = s.replace(/\./g, "");
  }
  const val = parseFloat(n);
  return Number.isFinite(val) ? val : NaN;
}

export const uid = () => Math.random().toString(36).slice(2, 9);

export function makeSerial(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, "0");
  return `COT-${ymd}-${rnd}`;
}

export const longDate = (iso?: string) =>
  new Intl.DateTimeFormat("es-VE", { dateStyle: "long" }).format(iso ? new Date(iso) : new Date());

export const shortDate = (iso?: string) =>
  new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    iso ? new Date(iso) : new Date()
  );

export const timeHM = (iso?: string) =>
  new Intl.DateTimeFormat("es-VE", { hour: "2-digit", minute: "2-digit", hour12: true }).format(
    iso ? new Date(iso) : new Date()
  );

/* ---------------------------------------------------------------- */
/*  WhatsApp                                                         */
/* ---------------------------------------------------------------- */

export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "58" + d.slice(1);
  if (d.length === 10) d = "58" + d;
  if (d.length < 10 || d.length > 15) return d.length >= 7 ? d : "";
  return d;
}

export function waUrl(phone: string, text: string): string {
  const digits = normalizePhone(phone);
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

/* ---------------------------------------------------------------- */
/*  Cotización                                                       */
/* ---------------------------------------------------------------- */

export interface QuoteLine {
  desc: string;
  qty: number;
  price: number;
}

export interface QuoteTotals {
  sub: number;
  dis: number;
  iva: number;
  igtf: number;
  total: number;
  equiv: number | null; // en la otra moneda
}

export interface QuotePayload {
  serial: string;
  pro: string;
  client: string;
  validity: number;
  currency: "USD" | "VES";
  lines: QuoteLine[];
  applyIva: boolean;
  applyIgtf: boolean;
  discountPct: number; // 0-100
  rate: number | null; // Bs por 1 USD
  rateLabel: string;
}

export function computeTotals(q: QuotePayload): QuoteTotals {
  const sub = q.lines.reduce((acc, l) => acc + l.qty * l.price, 0);
  const dis = (sub * Math.min(Math.max(q.discountPct, 0), 100)) / 100;
  const base = sub - dis;
  const iva = q.applyIva ? base * 0.16 : 0;
  const igtf = q.applyIgtf ? base * 0.03 : 0;
  const total = base + iva + igtf;
  const equiv =
    q.rate && q.rate > 0
      ? q.currency === "USD"
        ? total * q.rate
        : total / q.rate
      : null;
  return { sub, dis, iva, igtf, total, equiv };
}

export function buildQuoteText(q: QuotePayload, t: QuoteTotals): string {
  const m = (n: number) => money(n, q.currency);
  const ln: string[] = [];

  ln.push(`*COTIZACIÓN ${q.serial}*`);
  if (q.pro) ln.push(`*${q.pro}*`);
  ln.push("─".repeat(22));
  ln.push(`Cliente: ${q.client || "—"}`);
  ln.push(`Fecha: ${shortDate()}`);
  ln.push(`Válida por: ${q.validity} ${q.validity === 1 ? "día" : "días"}`);
  ln.push("");
  ln.push("*DETALLE DE SERVICIOS*");
  q.lines.forEach((l, i) => {
    ln.push(`${i + 1}. ${l.desc || "Servicio"}`);
    ln.push(`   ${fmtMax2(l.qty)} × ${m(l.price)} = ${m(l.qty * l.price)}`);
  });
  ln.push("");
  ln.push(`Subtotal: ${m(t.sub)}`);
  if (t.dis > 0) ln.push(`Descuento (${fmtMax2(q.discountPct)}%): −${m(t.dis)}`);
  if (q.applyIva) ln.push(`IVA (16%): ${m(t.iva)}`);
  if (q.applyIgtf) ln.push(`IGTF (3%): ${m(t.igtf)}`);
  ln.push(`*TOTAL: ${m(t.total)}${q.currency === "USD" ? " USD" : ""}*`);
  if (t.equiv != null && q.rate) {
    const eq =
      q.currency === "USD"
        ? `≈ ${money(t.equiv, "VES")} · Tasa ${q.rateLabel}: ${fmtMax2(q.rate)} Bs/USD`
        : `≈ ${money(t.equiv, "USD")} · Tasa ${q.rateLabel}: ${fmtMax2(q.rate)} Bs/USD`;
    ln.push(`_${eq}_`);
  }
  ln.push("");
  ln.push("_Precios sujetos a la tasa del día de pago._");
  ln.push("_Gracias por su preferencia. Quedo a la orden._");

  return ln.join("\n");
}

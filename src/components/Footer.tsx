import { ShieldCheck, Globe, ArrowLeftRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06] bg-ink-950/80">
      <div className="mx-auto grid max-w-xl gap-10 px-5 py-12">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 shadow-[0_8px_20px_-8px_rgba(246,192,75,0.7)]">
              <ArrowLeftRight className="h-4.5 w-4.5" strokeWidth={2.6} />
            </span>
            <div>
              <p className="font-display text-sm font-bold tracking-tight text-white">TASA AL DÍA</p>
              <p className="num text-[9px] font-semibold uppercase tracking-[0.3em] text-gold-400">
                Venezuela · Hoy
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-md text-xs leading-relaxed text-white/40">
            Herramienta informativa para el día a día. Las tasas BCV, paralelo y euro
            provienen de DolarApi; la de Binance sale del mercado P2P USDT/VES en tiempo
            real, con espejos que se actualizan cada 30 minutos. Verifica siempre el valor
            vigente en{" "}
            <a
              href="https://www.bcv.org.ve"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-gold-300 underline decoration-gold-400/40 underline-offset-2 hover:text-gold-200"
            >
              bcv.org.ve
            </a>{" "}
            y en{" "}
            <a
              href="https://ve.dolarapi.com"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-gold-300 underline decoration-gold-400/40 underline-offset-2 hover:text-gold-200"
            >
              ve.dolarapi.com
            </a>{" "}
            antes de cerrar una operación. No constituye asesoría financiera.
          </p>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-white/40">
          <p className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            Privacidad total: tus cotizaciones y tasas se guardan solo en este
            navegador. Nada viaja a ningún servidor.
          </p>
          <p className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gold-400/25 bg-gold-400/10 text-gold-300">
              <Globe className="h-3.5 w-3.5" />
            </span>
            Ligera y lista para insertar en Google Sites: publica esta página y en tu
            Sites usa <span className="font-semibold text-white/60">Insertar → Incorporar → URL</span>.
          </p>
        </div>
      </div>
      <div className="border-t border-white/[0.05] py-5">
        <p className="num text-center text-[9.5px] font-semibold uppercase tracking-[0.3em] text-white/25">
          Tasa al Día VE · {new Date().getFullYear()} · Hecho para profesionales y freelancers de Venezuela
        </p>
      </div>
    </footer>
  );
}

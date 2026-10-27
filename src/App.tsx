import { useEffect, useState } from "react";
import {
  Share2,
  Download,
  X,
  Smartphone,
  MonitorSmartphone,
  Check,
} from "lucide-react";
import Backdrop from "./components/Backdrop";
import TopTool from "./components/TopTool";
import MathCalc from "./components/MathCalc";
import Quoter from "./components/Quoter";
import Footer from "./components/Footer";
import { useSpotRates } from "./lib/rates";
import { useNow } from "./hooks/hooks";

interface BIPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function Header() {
  const now = useNow();
  const [installEvt, setInstallEvt] = useState<BIPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BIPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const date = new Intl.DateTimeFormat("es-VE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
    .format(now)
    .replace(/[.,]/g, "")
    .toUpperCase();

  const share = async () => {
    const data = {
      title: "Tasa al Día VE",
      text: "Dólar BCV hoy, tasas del día, calculadora y cotizador por WhatsApp",
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* cancelado */
      }
    }
    try {
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = data.url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const install = async () => {
    if (installed) return;
    if (installEvt) {
      await installEvt.prompt();
      const { outcome } = await installEvt.userChoice;
      if (outcome === "accepted") setInstallEvt(null);
      return;
    }
    setShowHelp(true);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-5 py-3">
          <a href="#inicio" className="flex min-w-0 items-center gap-2.5">
            <img
              src="icons/icon-192.png"
              alt="Tasa al Día"
              className="h-9 w-9 rounded-xl shadow-[0_6px_16px_-6px_rgba(255,201,23,0.7)]"
            />
            <span className="leading-tight">
              <span className="block truncate text-[15px] font-extrabold tracking-tight text-white">
                Tasa al Día
              </span>
              <span className="num block text-[9px] font-bold uppercase tracking-[0.3em] text-gold-400">
                Venezuela · BCV
              </span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            <span className="num hidden rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/55 lg:block">
              {date}
            </span>
            <button
              onClick={share}
              aria-label="Compartir esta app"
              title="Compartir esta app"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70 transition-colors hover:border-gold-400/50 hover:text-gold-300 active:scale-95"
            >
              <Share2 className="h-4.5 w-4.5" strokeWidth={2.2} />
            </button>
            <button
              onClick={install}
              disabled={installed}
              aria-label="Instalar como aplicación"
              className="flex h-10 items-center gap-2 rounded-xl bg-gold-400 px-3.5 text-xs font-extrabold text-ink-950 transition-all hover:bg-gold-300 active:scale-95 disabled:opacity-60"
            >
              <Download className="h-4 w-4" strokeWidth={2.6} />
              <span className="hidden sm:inline">{installed ? "Instalada" : "Instalar"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* toast enlace copiado */}
      {copied && (
        <div className="rise fixed bottom-6 left-1/2 z-[80] -translate-x-1/2">
          <span className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-ink-800 px-4 py-2 text-xs font-bold text-emerald-300 shadow-2xl">
            <Check className="h-3.5 w-3.5" />
            Enlace copiado
          </span>
        </div>
      )}

      {/* ayuda de instalación */}
      {showHelp && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/80 p-5 backdrop-blur-sm"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="glass-strong rise w-full max-w-sm rounded-3xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400 text-ink-950">
                  <Download className="h-5 w-5" strokeWidth={2.6} />
                </span>
                <h3 className="text-base font-extrabold text-white">Instala Tasa al Día</h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                aria-label="Cerrar"
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="mt-5 space-y-4 text-[13px] leading-relaxed text-white/60">
              <p className="flex gap-3">
                <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-gold-400" />
                <span>
                  <b className="text-white">Android:</b> en Chrome abre el menú{" "}
                  <b className="text-white">⋮</b> y toca{" "}
                  <b className="text-white">«Instalar app»</b> o{" "}
                  <b className="text-white">«Agregar a pantalla de inicio»</b>.
                </span>
              </p>
              <p className="flex gap-3">
                <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-gold-400" />
                <span>
                  <b className="text-white">iPhone / iPad:</b> en Safari toca{" "}
                  <b className="text-white">Compartir</b> y luego{" "}
                  <b className="text-white">«Agregar a pantalla de inicio»</b>.
                </span>
              </p>
              <p className="flex gap-3">
                <MonitorSmartphone className="mt-0.5 h-5 w-5 shrink-0 text-gold-400" />
                <span>
                  <b className="text-white">Computadora (PC/Mac):</b> en Chrome o Edge busca el
                  ícono de <b className="text-white">instalación en la barra de direcciones</b>.
                </span>
              </p>
              <p className="rounded-xl border border-gold-400/25 bg-gold-400/[0.07] p-3 text-[12px] text-gold-200/90">
                Si la ves dentro de Google Sites, ábrela primero desde su enlace directo y luego
                instálala.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  const spot = useSpotRates();

  return (
    <div id="top" className="relative min-h-screen font-body antialiased">
      <Backdrop />
      <Header />
      <main className="relative z-10 pb-10">
        <TopTool spot={spot} />
        <MathCalc />
        <Quoter spot={spot} />
      </main>
      <Footer />
    </div>
  );
}

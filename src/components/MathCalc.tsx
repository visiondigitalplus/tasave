import { useState } from "react";
import { Delete, Divide, X, Minus, Plus, Equal, Percent, Calculator } from "lucide-react";
import SectionHead from "./SectionHead";
import { Reveal } from "../hooks/hooks";
import { cn } from "../utils/cn";

type Op = "+" | "-" | "*" | "/";

const OP_SYM: Record<Op, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

const apply = (a: number, b: number, op: Op): number =>
  op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : a / b;

const trim = (n: number): string => {
  if (!Number.isFinite(n)) return "Error";
  return String(Number(n.toFixed(10)));
};

type Kind = "num" | "op" | "util" | "equal";

interface Btn {
  label?: string;
  icon?: React.ReactNode;
  kind: Kind;
  action: () => void;
  span?: boolean;
}

export default function MathCalc() {
  const [display, setDisplay] = useState("0");
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);

  const digit = (d: string) => {
    if (display === "Error" || fresh) {
      setDisplay(d);
      setFresh(false);
      return;
    }
    if (display.replace(/[-.]/g, "").length >= 12) return;
    setDisplay(display === "0" ? d : display + d);
  };

  const dot = () => {
    if (display === "Error" || fresh) {
      setDisplay("0.");
      setFresh(false);
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  };

  const clearAll = () => {
    setDisplay("0");
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const back = () => {
    if (display === "Error") return clearAll();
    if (fresh) return;
    setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : "0"));
  };

  const percent = () => {
    const v = parseFloat(display);
    if (Number.isFinite(v)) setDisplay(trim(v / 100));
    setFresh(true);
  };

  const setOperator = (next: Op) => {
    const cur = parseFloat(display);
    const safe = Number.isFinite(cur) ? cur : 0;
    if (acc == null) {
      setAcc(safe);
    } else if (op && !fresh) {
      const res = apply(acc, safe, op);
      if (!Number.isFinite(res)) {
        setDisplay("Error");
        setAcc(null);
        setOp(null);
        setFresh(true);
        return;
      }
      setAcc(res);
      setDisplay(trim(res));
    }
    setOp(next);
    setFresh(true);
  };

  const equals = () => {
    if (op == null || acc == null) return;
    const cur = parseFloat(display);
    const res = apply(acc, Number.isFinite(cur) ? cur : 0, op);
    setDisplay(Number.isFinite(res) ? trim(res) : "Error");
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const btns: Btn[] = [
    { label: "C", kind: "util", action: clearAll },
    { icon: <Delete className="mx-auto h-5 w-5" />, kind: "util", action: back },
    { icon: <Percent className="mx-auto h-5 w-5" />, kind: "util", action: percent },
    { icon: <Divide className="mx-auto h-5 w-5" />, kind: "op", action: () => setOperator("/") },
    { label: "7", kind: "num", action: () => digit("7") },
    { label: "8", kind: "num", action: () => digit("8") },
    { label: "9", kind: "num", action: () => digit("9") },
    { icon: <X className="mx-auto h-5 w-5" />, kind: "op", action: () => setOperator("*") },
    { label: "4", kind: "num", action: () => digit("4") },
    { label: "5", kind: "num", action: () => digit("5") },
    { label: "6", kind: "num", action: () => digit("6") },
    { icon: <Minus className="mx-auto h-5 w-5" />, kind: "op", action: () => setOperator("-") },
    { label: "1", kind: "num", action: () => digit("1") },
    { label: "2", kind: "num", action: () => digit("2") },
    { label: "3", kind: "num", action: () => digit("3") },
    { icon: <Plus className="mx-auto h-5 w-5" />, kind: "op", action: () => setOperator("+") },
    { label: "0", kind: "num", action: () => digit("0"), span: true },
    { label: ",", kind: "num", action: dot },
    { icon: <Equal className="mx-auto h-5 w-5" />, kind: "equal", action: equals },
  ];

  const pending = acc != null && op ? `${trim(acc).replace(/\./g, ",")} ${OP_SYM[op]}` : "";
  const shown = display === "Error" ? "Error" : display.replace(/\./g, ",");

  return (
    <section id="matematica" className="relative scroll-mt-20">
      <div className="mx-auto max-w-xl px-5 pb-4 pt-10">
        <SectionHead
          icon={Calculator}
          eyebrow="Calculadora matemática"
          title="Haz cuentas sin salir de aquí."
          desc="Suma, resta, multiplica, divide y saca porcentajes, como la calculadora de tu teléfono."
        />

        <Reveal className="glass rounded-3xl p-4 sm:p-5">
          {/* pantalla */}
          <div className="rounded-2xl border border-white/[0.08] bg-ink-900 px-5 py-5 text-right">
            <p className="num h-5 text-sm font-semibold text-gold-300/70">{pending}</p>
            <p className="num mt-1 break-all text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              {shown}
            </p>
          </div>

          {/* teclas */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {btns.map((b, i) => (
              <button
                key={i}
                onClick={b.action}
                className={cn(
                  "num flex h-14 items-center justify-center rounded-2xl border text-xl font-bold transition-all duration-150 active:scale-[0.94] sm:h-16",
                  b.span && "col-span-2",
                  b.kind === "num" &&
                    "border-white/[0.07] bg-ink-900 text-white hover:bg-ink-700",
                  b.kind === "util" &&
                    "border-white/[0.06] bg-white/[0.06] text-white/70 hover:bg-white/[0.1]",
                  b.kind === "op" &&
                    "border-gold-400/25 bg-gold-400/15 text-gold-300 hover:bg-gold-400/25",
                  b.kind === "equal" &&
                    "border-gold-400 bg-gold-400 text-ink-950 shadow-[0_8px_20px_-8px_rgba(255,201,23,0.6)] hover:bg-gold-300"
                )}
              >
                {b.icon ?? b.label}
              </button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

import type { LucideIcon } from "lucide-react";
import { Reveal } from "../hooks/hooks";

export default function SectionHead({
  icon: Icon,
  eyebrow,
  title,
  desc,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  desc: string;
}) {
  return (
    <Reveal className="mb-6 flex flex-col items-start gap-3">
      <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/25 bg-gold-400/10 px-3 py-1">
        <Icon className="h-3.5 w-3.5 text-gold-400" strokeWidth={2.4} />
        <span className="num text-[10px] font-bold uppercase tracking-[0.24em] text-gold-300">
          {eyebrow}
        </span>
      </span>
      <h2 className="font-display text-[1.65rem] font-extrabold leading-[1.12] tracking-tight text-white sm:text-3xl">
        {title}
      </h2>
      <p className="text-sm leading-relaxed text-white/50">{desc}</p>
    </Reveal>
  );
}

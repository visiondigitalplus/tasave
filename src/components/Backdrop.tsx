export default function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-ink-950" />
      {/* halo amarillo suave arriba */}
      <div
        className="absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(255,201,23,0.10), transparent 68%)" }}
      />
      {/* halo verde tenue abajo */}
      <div
        className="absolute bottom-[-160px] right-[-120px] h-[420px] w-[560px] rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(51,217,115,0.05), transparent 65%)" }}
      />
      <div className="noise absolute inset-0 opacity-[0.035] mix-blend-overlay" />
    </div>
  );
}

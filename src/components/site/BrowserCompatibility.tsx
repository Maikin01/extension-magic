const BROWSERS = [
  { name: "Chrome", slug: "googlechrome", color: "4285F4" },
  { name: "Edge", slug: "microsoftedge", color: "0078D7" },
  { name: "Firefox", slug: "firefoxbrowser", color: "FF7139" },
  { name: "Brave", slug: "brave", color: "FB542B" },
  { name: "Opera", slug: "opera", color: "FF1B2D" },
  { name: "Safari", slug: "safari", color: "006CFF" },
];

export function BrowserCompatibility() {
  // Duplicate list for seamless infinite marquee
  const items = [...BROWSERS, ...BROWSERS, ...BROWSERS];

  return (
    <section className="relative border-y border-white/5 bg-[#050505] py-6 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.35em] text-white/40">
          Compatível com todos os navegadores
        </p>

        <div className="browser-marquee mt-5">
          <div className="browser-marquee-track">
            {items.map((b, i) => (
              <div key={`${b.slug}-${i}`} className="browser-item group">
                <img
                  src={`https://cdn.simpleicons.org/${b.slug}/_/${b.color}`}
                  alt={b.name}
                  className="browser-logo h-7 w-7 shrink-0"
                  loading="lazy"
                />
                <span className="browser-label">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

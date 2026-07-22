const BROWSERS = [
  { name: "Chrome", slug: "googlechrome" },
  { name: "Edge", slug: "microsoftedge" },
  { name: "Firefox", slug: "firefoxbrowser" },
  { name: "Brave", slug: "brave" },
  { name: "Opera", slug: "opera" },
  { name: "Safari", slug: "safari" },
];

export function BrowserCompatibility() {
  // Duplicate list for seamless infinite marquee
  const items = [...BROWSERS, ...BROWSERS, ...BROWSERS];

  return (
    <section className="relative border-y border-white/5 bg-[#050505] py-14 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.35em] text-white/40">
          Compatível com todos os navegadores
        </p>

        <div className="browser-marquee mt-10">
          <div className="browser-marquee-track">
            {items.map((b, i) => (
              <div key={`${b.slug}-${i}`} className="browser-item group">
                <img
                  src={`https://cdn.simpleicons.org/${b.slug}`}
                  alt={b.name}
                  className="browser-logo h-8 w-8 shrink-0"
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

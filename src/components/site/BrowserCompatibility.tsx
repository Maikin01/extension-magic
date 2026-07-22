import chromeLogo from "@/assets/chrome.png.asset.json";
import edgeLogo from "@/assets/edge.png.asset.json";
import braveLogo from "@/assets/brave.png.asset.json";
import operaLogo from "@/assets/opera.png.asset.json";
import safariLogo from "@/assets/safari.png.asset.json";
import firefoxLogo from "@/assets/firefox.png.asset.json";

const BROWSERS = [
  { name: "Chrome", src: chromeLogo.url },
  { name: "Edge", src: edgeLogo.url },
  { name: "Brave", src: braveLogo.url },
  { name: "Opera", src: operaLogo.url },
  { name: "Safari", src: safariLogo.url },
  { name: "Firefox", src: firefoxLogo.url },
];

export function BrowserCompatibility() {
  const items = [...BROWSERS, ...BROWSERS, ...BROWSERS];

  return (
    <section className="relative border-y border-white/5 bg-[#050505] py-10 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.35em] text-white/40">
          Compatível com todos os navegadores
        </p>

        <div className="browser-marquee mt-8">
          <div className="browser-marquee-track">
            {items.map((b, i) => (
              <div key={`${b.name}-${i}`} className="browser-item group">
                <img
                  src={b.src}
                  alt={b.name}
                  className="browser-logo h-12 w-12 shrink-0 object-contain"
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

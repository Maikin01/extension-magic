export function BottomBlur() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] h-32"
      style={{
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitMaskImage:
          "linear-gradient(to top, black 0%, black 40%, transparent 100%)",
        maskImage:
          "linear-gradient(to top, black 0%, black 40%, transparent 100%)",
        background:
          "linear-gradient(to top, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.25) 60%, transparent 100%)",
      }}
    />
  );
}

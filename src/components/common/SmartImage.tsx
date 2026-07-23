import { useEffect, useRef, useState } from "react";

/**
 * Smart cover image.
 *
 * Measures the image and container aspect ratios to choose the best fit:
 *  - Similar ratios  → object-cover (crisp, fills the frame)
 *  - Different ratios → object-contain over a softly blurred backdrop
 *    (never crops faces / logos / captions)
 */
export function SmartImage({
  src,
  alt,
  className = "",
  loading = "lazy",
  width,
  height,
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  width?: number;
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"cover" | "contain">("cover");
  const [loaded, setLoaded] = useState(false);

  const decide = (imgW: number, imgH: number) => {
    const el = wrapRef.current;
    if (!el || !imgW || !imgH) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (!cw || !ch) return;
    const imgRatio = imgW / imgH;
    const boxRatio = cw / ch;
    const diff = Math.abs(imgRatio - boxRatio) / boxRatio;
    // within 20% → cover looks natural; otherwise avoid cropping
    setMode(diff <= 0.2 ? "cover" : "contain");
  };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const img = el.querySelector<HTMLImageElement>("img[data-primary]");
      if (img?.naturalWidth) decide(img.naturalWidth, img.naturalHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden bg-muted"
    >
      {mode === "contain" && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          decoding="async"
          loading="lazy"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-60"
        />
      )}
      <img
        data-primary
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        fetchPriority={loading === "eager" ? "high" : "auto"}
        width={width}
        height={height}
        onLoad={(e) => {
          const img = e.currentTarget;
          decide(img.naturalWidth, img.naturalHeight);
          setLoaded(true);
        }}
        className={`relative h-full w-full transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${mode === "cover" ? "object-cover" : "object-contain"} ${className}`}
      />
    </div>
  );
}

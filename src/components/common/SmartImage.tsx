/**
 * Smart cover image.
 *
 * Always shows the FULL image (object-contain) over a blurred, zoomed copy of
 * the same image that fills the frame. This prevents ugly crops where logos,
 * faces, or captions get sliced off — the whole subject is always visible.
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
  return (
    <div className="relative h-full w-full overflow-hidden bg-muted">
      <img
        src={src}
        alt=""
        aria-hidden="true"
        decoding="async"
        loading="lazy"
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-70"
      />
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        fetchPriority={loading === "eager" ? "high" : "auto"}
        width={width}
        height={height}
        className={`relative h-full w-full object-contain ${className}`}
      />
    </div>
  );
}

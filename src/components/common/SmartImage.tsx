import { useCallback, useState } from "react";

/**
 * Smart cover image.
 *
 * Landscape news photos are cropped normally (object-cover, anchored to the top
 * so the bottom caption/watermark band is pushed out of view). Portrait photos
 * — e.g. a person's headshot — would otherwise be cropped down to just the eyes
 * in a wide 16:10 / 2:1 frame, so we instead show the whole portrait
 * (object-contain) over a blurred, zoomed copy of the same image that fills the
 * frame. This is the "smart" portal look where the full face is always visible.
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
  const [portrait, setPortrait] = useState(false);

  const measure = useCallback((img: HTMLImageElement | null) => {
    if (img && img.naturalWidth) {
      setPortrait(img.naturalHeight > img.naturalWidth * 1.05);
    }
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {portrait && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          decoding="async"
          loading="lazy"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
        />
      )}
      <img
        ref={measure}
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        fetchPriority={loading === "eager" ? "high" : "auto"}
        width={width}
        height={height}
        onLoad={(e) => measure(e.currentTarget)}
        className={
          portrait
            ? `relative h-full w-full object-contain ${className}`
            : `img-crop-caption relative ${className}`
        }
      />
    </div>
  );
}

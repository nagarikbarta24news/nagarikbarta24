import { useState } from "react";

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

  return (
    <div className="relative h-full w-full overflow-hidden">
      {portrait && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
        />
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        width={width}
        height={height}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalHeight > img.naturalWidth * 1.05) setPortrait(true);
        }}
        className={
          portrait
            ? `relative h-full w-full object-contain ${className}`
            : `img-crop-caption relative ${className}`
        }
      />
    </div>
  );
}

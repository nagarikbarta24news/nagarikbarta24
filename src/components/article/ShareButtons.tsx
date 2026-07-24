import { useState } from "react";
import { Facebook, Instagram, Linkedin, Twitter, Send, Link2, Check, Share2 } from "lucide-react";
import { absoluteUrl } from "@/lib/site";
import { shareOnFacebook } from "@/lib/fb-sdk";

/** WhatsApp glyph (not in lucide) */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

type Variant = "row" | "bar" | "compact";

export function ShareButtons({
  path,
  title,
  className = "",
  size = "sm",
  variant = "row",
  showLabel = false,
}: {
  path: string;
  title: string;
  className?: string;
  size?: "sm" | "md";
  variant?: Variant;
  showLabel?: boolean;
}) {
  const url = absoluteUrl(path);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} ${url}`)}`;
  const tgUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const xUrl = `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;

  const iconSize = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const btnSize = size === "md" ? "h-9 w-9" : "h-8 w-8";

  const [copied, setCopied] = useState(false);

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const shareInstagram = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      navigator.clipboard?.writeText(`${title} ${url}`);
    } catch {
      /* ignore */
    }
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  const shareFacebook = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const ok = await shareOnFacebook(url, title);
    if (!ok) {
      window.open(fbUrl, "_blank", "noopener,noreferrer,width=600,height=500");
    }
  };

  const copyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        /* ignore */
      }
      ta.remove();
    }
  };

  const nativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title,
          url,
          text: title,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      await copyLink(e);
    }
  };

  // Shared button classes: crisp circles with brand color, subtle scale on hover.
  const btn =
    `group relative flex ${btnSize} items-center justify-center rounded-full text-white shadow-sm ` +
    `ring-1 ring-black/5 transition-all duration-200 hover:scale-110 hover:shadow-md active:scale-95 ` +
    `focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-news-red/40`;

  const container =
    variant === "bar"
      ? "flex items-center gap-2 rounded-full border border-border bg-background/95 p-1.5 shadow-sm backdrop-blur"
      : variant === "compact"
        ? "flex items-center gap-1.5"
        : "flex flex-wrap items-center gap-2";

  return (
    <div
      className={`${container} ${className}`}
      role="group"
      aria-label="সোশ্যাল মিডিয়ায় শেয়ার করুন"
    >
      {showLabel && (
        <span className="mr-1 inline-flex items-center gap-1.5 pl-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Share2 className="h-3.5 w-3.5" /> শেয়ার
        </span>
      )}

      <a
        href={fbUrl}
        target="_blank"
        rel="noreferrer"
        onClick={shareFacebook}
        aria-label="ফেসবুকে শেয়ার করুন"
        title="Facebook"
        className={`${btn} bg-[#1877F2] hover:bg-[#1466d6]`}
      >
        <Facebook className={iconSize} />
      </a>

      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        onClick={stop}
        aria-label="হোয়াটসঅ্যাপে শেয়ার করুন"
        title="WhatsApp"
        className={`${btn} bg-[#25D366] hover:bg-[#1fbf5c]`}
      >
        <WhatsAppIcon className={iconSize} />
      </a>

      <a
        href={tgUrl}
        target="_blank"
        rel="noreferrer"
        onClick={stop}
        aria-label="টেলিগ্রামে শেয়ার করুন"
        title="Telegram"
        className={`${btn} bg-[#0088cc] hover:bg-[#0077b3]`}
      >
        <Send className={iconSize} />
      </a>

      <a
        href={xUrl}
        target="_blank"
        rel="noreferrer"
        onClick={stop}
        aria-label="এক্সে (টুইটার) শেয়ার করুন"
        title="X"
        className={`${btn} bg-black hover:bg-neutral-800`}
      >
        <Twitter className={iconSize} />
      </a>

      <a
        href={linkedInUrl}
        target="_blank"
        rel="noreferrer"
        onClick={stop}
        aria-label="লিংকডইনে শেয়ার করুন"
        title="LinkedIn"
        className={`${btn} bg-[#0A66C2] hover:bg-[#0955a3]`}
      >
        <Linkedin className={iconSize} />
      </a>

      <button
        type="button"
        onClick={shareInstagram}
        aria-label="ইনস্টাগ্রামে শেয়ার করুন (লিংক কপি হবে)"
        title="Instagram"
        className={`${btn} bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5]`}
      >
        <Instagram className={iconSize} />
      </button>

      <button
        type="button"
        onClick={copyLink}
        aria-label={copied ? "লিংক কপি হয়েছে" : "লিংক কপি করুন"}
        title={copied ? "Copied!" : "Copy link"}
        className={`${btn} ${copied ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-700 hover:bg-slate-800"}`}
      >
        {copied ? <Check className={iconSize} /> : <Link2 className={iconSize} />}
      </button>

      {/* Native share sheet (mobile) — only rendered client-side to avoid SSR mismatch. */}
      <button
        type="button"
        onClick={nativeShare}
        aria-label="আরও শেয়ার অপশন"
        title="More"
        className={`${btn} bg-news-red hover:bg-news-red/90 md:hidden`}
      >
        <Share2 className={iconSize} />
      </button>
    </div>
  );
}

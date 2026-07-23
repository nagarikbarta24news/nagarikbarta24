import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
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

export function ShareButtons({
  path,
  title,
  className = "",
  size = "sm",
}: {
  path: string;
  title: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const url = absoluteUrl(path);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} ${url}`)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const xUrl = `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
  const iconSize = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const btnSize = size === "md" ? "h-9 w-9" : "h-7 w-7";

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  // Instagram has no direct web share URL, so copy the link to the clipboard
  // and open Instagram so the user can paste it into a story/DM/bio.
  const shareInstagram = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      navigator.clipboard?.writeText(`${title} ${url}`);
    } catch {
      /* ignore clipboard errors */
    }
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  const shareFacebook = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const ok = await shareOnFacebook(url, title);
    if (!ok) {
      // Fallback: sharer.php popup if SDK unavailable / dialog blocked
      window.open(fbUrl, "_blank", "noopener,noreferrer,width=600,height=500");
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <a
        href={fbUrl}
        target="_blank"
        rel="noreferrer"
        onClick={shareFacebook}
        aria-label="ফেসবুকে শেয়ার করুন"
        title="ফেসবুকে শেয়ার করুন"
        className={`flex ${btnSize} items-center justify-center rounded-full bg-[#1877F2] text-white transition-opacity hover:opacity-85`}
      >
        <Facebook className={iconSize} />
      </a>
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        onClick={stop}
        aria-label="হোয়াটসঅ্যাপে শেয়ার করুন"
        title="হোয়াটসঅ্যাপে শেয়ার করুন"
        className={`flex ${btnSize} items-center justify-center rounded-full bg-[#25D366] text-white transition-opacity hover:opacity-85`}
      >
        <WhatsAppIcon className={iconSize} />
      </a>
      <button
        type="button"
        onClick={shareInstagram}
        aria-label="ইনস্টাগ্রামে শেয়ার করুন (লিংক কপি হবে)"
        title="ইনস্টাগ্রামে শেয়ার করুন (লিংক কপি হবে)"
        className={`flex ${btnSize} items-center justify-center rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white transition-opacity hover:opacity-85`}
      >
        <Instagram className={iconSize} />
      </button>
      <a
        href={linkedInUrl}
        target="_blank"
        rel="noreferrer"
        onClick={stop}
        aria-label="লিংকডইনে শেয়ার করুন"
        title="লিংকডইনে শেয়ার করুন"
        className={`flex ${btnSize} items-center justify-center rounded-full bg-[#0A66C2] text-white transition-opacity hover:opacity-85`}
      >
        <Linkedin className={iconSize} />
      </a>
      <a
        href={xUrl}
        target="_blank"
        rel="noreferrer"
        onClick={stop}
        aria-label="এক্সে (টুইটার) শেয়ার করুন"
        title="এক্সে (টুইটার) শেয়ার করুন"
        className={`flex ${btnSize} items-center justify-center rounded-full bg-black text-white transition-opacity hover:opacity-85`}
      >
        <Twitter className={iconSize} />
      </a>
    </div>
  );
}

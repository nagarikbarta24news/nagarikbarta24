import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const UPLOAD_PREFIX = "manual";

function safeExt(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^(png|jpe?g|webp|gif|avif)$/.test(fromName)) return fromName;
  const fromType = file.type.split("/").pop()?.toLowerCase();
  if (fromType === "jpeg") return "jpg";
  return fromType && /^(png|jpg|webp|gif|avif)$/.test(fromType) ? fromType : "jpg";
}

export function ImageUpload({
  value,
  onChange,
  label = "ছবির লিংক",
  presets = [],
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  presets?: { url: string; label: string }[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("শুধুমাত্র ছবি আপলোড করা যাবে।");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("ছবির আকার ১০ MB-এর কম হতে হবে।");
      return;
    }
    setUploading(true);
    try {
      const ext = safeExt(file);
      const path = `${UPLOAD_PREFIX}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("article-media")
        .upload(path, file, { cacheControl: "31536000", upsert: false });
      if (upErr) throw upErr;
      onChange(`/api/public/media/${path}`);
      toast.success("ছবি আপলোড হয়েছে।");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "আপলোড ব্যর্থ।");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      {value ? (
        <div className="relative overflow-hidden rounded-md border">
          <img src={value} alt="প্রিভিউ" className="aspect-video w-full object-cover" />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute right-2 top-2"
            onClick={() => onChange("")}
          >
            সরান
          </Button>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "আপলোড হচ্ছে…" : "ছবি আপলোড"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://... অথবা উপরে আপলোড করুন"
      />
      {presets.length > 0 ? (
        <div>
          <Label className="mb-2 block text-xs text-muted-foreground">বিল্ট-ইন ছবি নির্বাচন করুন</Label>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((p) => (
              <button
                key={p.url}
                type="button"
                onClick={() => onChange(p.url)}
                title={p.label}
                className={`relative overflow-hidden rounded-md border transition ${
                  value === p.url ? "ring-2 ring-primary" : "hover:opacity-80"
                }`}
              >
                <img src={p.url} alt={p.label} className="aspect-video w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

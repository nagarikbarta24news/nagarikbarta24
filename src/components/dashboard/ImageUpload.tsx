import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Signed URLs last ~10 years so stored links stay valid for published articles.
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

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
      const ext = file.name.split(".").pop() || "jpg";
      const path = `articles/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file, { cacheControl: "31536000", upsert: false });
      if (upErr) throw upErr;
      const { data, error: signErr } = await supabase.storage
        .from("media")
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (signErr || !data) throw signErr ?? new Error("signed url failed");
      onChange(data.signedUrl);
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
    </div>
  );
}

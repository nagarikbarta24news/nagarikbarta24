import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ImageUpload } from "@/components/dashboard/ImageUpload";
import payScaleCover from "@/assets/news-pay-scale.jpg";
import { listAllCategories, getArticleById, upsertArticle } from "@/lib/cms.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9\u0980-\u09FF\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);
}

type Status = "draft" | "pending_review" | "published" | "archived" | "scheduled";

export function ArticleEditor({ id }: { id?: string }) {
  const navigate = useNavigate();
  const { data: categories } = useQuery({ queryKey: ["cms-cats"], queryFn: () => listAllCategories() });
  const { data: existing } = useQuery({
    queryKey: ["cms-article", id],
    queryFn: () => getArticleById({ data: { id: id! } }),
    enabled: !!id,
  });

  const [form, setForm] = useState({
    title: "", subtitle: "", slug: "", content: "", excerpt: "",
    featured_image: "", og_image: "", image_caption: "", category_id: null as number | null,
    status: "draft" as Status, is_breaking: false, is_featured: false,
    read_time_mins: 2, seo_title: "", seo_description: "", greeting_message: "",
  });
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title, subtitle: existing.subtitle ?? "", slug: existing.slug,
        content: existing.content, excerpt: existing.excerpt ?? "",
        featured_image: existing.featured_image ?? "", og_image: (existing as { og_image?: string | null }).og_image ?? "", image_caption: existing.image_caption ?? "",
        category_id: existing.category_id, status: existing.status as Status,
        is_breaking: existing.is_breaking, is_featured: existing.is_featured,
        read_time_mins: existing.read_time_mins, seo_title: existing.seo_title ?? "",
        seo_description: existing.seo_description ?? "",
        greeting_message: (existing as { greeting_message?: string | null }).greeting_message ?? "",
      });
      setSlugTouched(true);
    }
  }, [existing]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: (status: Status) =>
      upsertArticle({
        data: {
          id, ...form, status,
          subtitle: form.subtitle || null, excerpt: form.excerpt || null,
          featured_image: form.featured_image || null, og_image: form.og_image || null, image_caption: form.image_caption || null,
          seo_title: form.seo_title || null, seo_description: form.seo_description || null,
        },
      }),
    onSuccess: () => {
      toast.success("সংবাদ সংরক্ষণ হয়েছে।");
      navigate({ to: "/dashboard" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "সংরক্ষণ ব্যর্থ।"),
  });

  return (
    <DashboardShell title={id ? "সংবাদ সম্পাদনা" : "নতুন সংবাদ"}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div>
            <Label>শিরোনাম *</Label>
            <Input
              value={form.title}
              onChange={(e) => {
                set("title", e.target.value);
                if (!slugTouched) set("slug", slugify(e.target.value));
              }}
              placeholder="সংবাদের শিরোনাম"
            />
          </div>
          <div>
            <Label>উপশিরোনাম</Label>
            <Input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
          </div>
          <div>
            <Label>স্লাগ (URL) *</Label>
            <Input value={form.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} />
          </div>
          <div>
            <Label>সারসংক্ষেপ</Label>
            <Textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} />
          </div>
          <div>
            <Label>মূল কনটেন্ট *</Label>
            <Textarea value={form.content} onChange={(e) => set("content", e.target.value)} rows={14} placeholder="প্রতিটি অনুচ্ছেদ নতুন লাইনে লিখুন।" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-bengali font-bold">প্রকাশনা</h3>
            <Label>বিভাগ</Label>
            <Select
              value={form.category_id ? String(form.category_id) : undefined}
              onValueChange={(v) => set("category_id", Number(v))}
            >
              <SelectTrigger><SelectValue placeholder="বিভাগ নির্বাচন করুন" /></SelectTrigger>
              <SelectContent>
                {(categories ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="breaking">ব্রেকিং নিউজ</Label>
                <Switch id="breaking" checked={form.is_breaking} onCheckedChange={(v) => set("is_breaking", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="featured">নির্বাচিত</Label>
                <Switch id="featured" checked={form.is_featured} onCheckedChange={(v) => set("is_featured", v)} />
              </div>
              <div>
                <Label>পড়ার সময় (মিনিট)</Label>
                <Input type="number" min={1} max={60} value={form.read_time_mins} onChange={(e) => set("read_time_mins", Number(e.target.value))} />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Button onClick={() => save.mutate("published")} disabled={save.isPending || !form.title || !form.slug || !form.content}>
                প্রকাশ করুন
              </Button>
              <Button variant="outline" onClick={() => save.mutate("draft")} disabled={save.isPending}>
                খসড়া সংরক্ষণ
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-bengali font-bold">ফিচার্ড ছবি</h3>
            <ImageUpload
              value={form.featured_image}
              onChange={(v) => set("featured_image", v)}
              presets={[{ url: payScaleCover, label: "নবম পে-স্কেল" }]}
            />
            <Label className="mt-3 block">ছবির ক্যাপশন</Label>
            <Input value={form.image_caption} onChange={(e) => set("image_caption", e.target.value)} />
            <Label className="mt-3 block">সোশ্যাল শেয়ার ছবি (OG, ১২০০×৬৩০)</Label>
            <p className="mb-2 text-xs text-muted-foreground">
              পোর্ট্রেট/লম্বা ছবির জন্য আলাদা ওয়াইড শেয়ার ছবি দিন যাতে ফেসবুক/হোয়াটসঅ্যাপ প্রিভিউতে পুরো মুখ দেখা যায়। খালি রাখলে ফিচার্ড ছবিই ব্যবহার হবে।
            </p>
            <Input
              value={form.og_image}
              onChange={(e) => set("og_image", e.target.value)}
              placeholder="https://... অথবা /api/public/media/..."
            />
          </div>


          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-bengali font-bold">শুভেচ্ছা বার্তা</h3>
            <Label className="text-xs text-muted-foreground">
              জন্মদিন/অভিনন্দনমূলক বার্তা — স্বয়ংক্রিয়ভাবে কনটেন্ট, SEO বিবরণ ও কীওয়ার্ডে যুক্ত হবে।
            </Label>
            <Textarea
              value={form.greeting_message}
              onChange={(e) => set("greeting_message", e.target.value)}
              rows={3}
              placeholder="যেমন: নাগরিক বার্তা ২৪ পরিবারের পক্ষ থেকে জন্মদিনের শুভেচ্ছা..."
              className="mt-2"
            />
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-bengali font-bold">SEO</h3>
            <Label>SEO শিরোনাম</Label>
            <Input value={form.seo_title} onChange={(e) => set("seo_title", e.target.value)} />
            <Label className="mt-3 block">SEO বিবরণ</Label>
            <Textarea value={form.seo_description} onChange={(e) => set("seo_description", e.target.value)} rows={3} />
            <p className="mt-2 text-xs text-muted-foreground">খালি রাখলে শুভেচ্ছা বার্তা থেকে স্বয়ংক্রিয়ভাবে তৈরি হবে।</p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

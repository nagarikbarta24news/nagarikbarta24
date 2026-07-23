import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { listAiImageArticles, clearArticleFeaturedImages } from "@/lib/cms.functions";

export const Route = createFileRoute("/_authenticated/image-audit")({
  head: () => ({
    meta: [
      { title: "AI ছবি অডিট | নাগরিক বার্তা ২৪" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ImageAuditPage,
});

type Row = {
  id: string;
  title: string;
  slug: string;
  status: string;
  featured_image: string | null;
  og_image: string | null;
  image_credit: string | null;
  published_at: string | null;
  category?: { name?: string; slug?: string } | null;
};

function ImageAuditPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["ai-image-audit"],
    queryFn: () => listAiImageArticles(),
  });
  const rows = (data ?? []) as Row[];

  const clear = useMutation({
    mutationFn: (ids: string[]) => clearArticleFeaturedImages({ data: { ids } }),
    onSuccess: (res) => {
      toast.success(`${res.updated}টি নিবন্ধের ছবি সরানো হয়েছে — ক্যাটাগরি ভিত্তিক বাস্তব ছবি ব্যবহার হবে।`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["ai-image-audit"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ব্যর্থ হয়েছে"),
  });

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected((s) => (s.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));

  const publishedCount = rows.filter((r) => r.status === "published").length;

  return (
    <DashboardShell title="AI-জেনারেটেড ছবি অডিট">
      <div className="mb-4 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-bengali font-semibold">
          সম্পাদকীয় সতর্কতা: বাস্তব ব্যক্তি/ঘটনার সংবাদে AI-জেনারেটেড ছবি ব্যবহার করা যাবে না।
        </p>
        <p className="font-bengali">
          নিচের তালিকায় থাকা নিবন্ধগুলোর ফিচার্ড ছবি AI দিয়ে তৈরি বা কম্পোজিট করা। প্রতিটি নিবন্ধ পরীক্ষা করে সঠিক
          বাস্তব ছবি দিন, অথবা নির্বাচন করে "ছবি সরান" চাপুন — তখন ক্যাটাগরি ভিত্তিক বাস্তব ছবি স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          মোট {rows.length}টি নিবন্ধ · প্রকাশিত {publishedCount}টি · নির্বাচিত {selected.size}টি
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={toggleAll} disabled={rows.length === 0}>
            {selected.size === rows.length && rows.length > 0 ? "নির্বাচন বাতিল" : "সব নির্বাচন"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={selected.size === 0 || clear.isPending}
            onClick={() => clear.mutate(Array.from(selected))}
          >
            নির্বাচিতগুলোর ছবি সরান
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="p-8 text-center font-bengali">লোড হচ্ছে…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border bg-card p-8 text-center font-bengali text-muted-foreground">
          কোনো AI-জেনারেটেড ছবি ব্যবহৃত নিবন্ধ নেই।
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left font-bengali text-xs uppercase">
              <tr>
                <th className="w-10 p-3"></th>
                <th className="p-3">ছবি</th>
                <th className="p-3">শিরোনাম</th>
                <th className="p-3">বিভাগ</th>
                <th className="p-3">স্ট্যাটাস</th>
                <th className="p-3">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-3">
                    <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                  </td>
                  <td className="p-3">
                    {r.featured_image ? (
                      <img
                        src={r.featured_image}
                        alt=""
                        className="h-16 w-24 rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 font-bengali">
                    <div className="line-clamp-2 font-semibold">{r.title}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {r.featured_image}
                    </div>
                  </td>
                  <td className="p-3 font-bengali text-xs">{r.category?.name ?? "—"}</td>
                  <td className="p-3">
                    <span
                      className={
                        r.status === "published"
                          ? "rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-800"
                          : "rounded bg-muted px-2 py-1 text-xs"
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/news/edit/$id" params={{ id: r.id }}>
                          সম্পাদনা
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/preview/$id" params={{ id: r.id }} target="_blank" rel="noreferrer">
                          প্রিভিউ
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}

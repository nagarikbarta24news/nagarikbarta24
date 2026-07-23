import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, ImageOff } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  listCleanCandidates,
  cleanArticleImages,
  type CleanCandidate,
} from "@/lib/image-clean.functions";

export const Route = createFileRoute("/_authenticated/image-clean")({
  component: ImageCleanPage,
  head: () => ({
    meta: [
      { title: "ছবি থেকে ওয়াটারমার্ক অপসারণ — নাগরিক বার্তা ২৪" },
      {
        name: "description",
        content:
          "প্রকাশিত আর্টিকেলের ছবি থেকে যুগান্তর, World Tone সহ সোর্স আউটলেটের লোগো ও লেখা AI দিয়ে সরান।",
      },
    ],
  }),
});

const BATCH = 5;

function ImageCleanPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["clean-candidates"],
    queryFn: () => listCleanCandidates(),
  });
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const cleanMut = useMutation({
    mutationFn: (ids: string[]) => cleanArticleImages({ data: { ids } }),
  });

  const runBatch = async (items: CleanCandidate[]) => {
    if (!items.length) return;
    setProgress({ done: 0, total: items.length });
    let done = 0;
    let creditsOut = false;
    for (let i = 0; i < items.length; i += BATCH) {
      const chunk = items.slice(i, i + BATCH);
      const ids = chunk.map((c) => c.id);
      setProcessingIds(new Set(ids));
      try {
        const res = await cleanMut.mutateAsync(ids);
        const okCount = res.results.filter((r) => r.ok).length;
        const failed = res.results.filter((r) => !r.ok);
        done += okCount;
        setProgress({ done, total: items.length });
        if (failed.some((f) => f.reason === "credits_exhausted")) {
          creditsOut = true;
          toast.error("Lovable AI credits exhausted। বাকিটা পরে চালান।");
          break;
        }
        if (failed.length) {
          toast.warning(`${failed.length}টি ছবি এই ব্যাচে পরিষ্কার হয়নি — পরে আবার চেষ্টা করুন।`);
        }
      } catch (e) {
        toast.error((e as Error).message);
        break;
      }
    }
    setProcessingIds(new Set());
    if (!creditsOut) toast.success(`${done}টি ছবি পরিষ্কার হয়েছে।`);
    qc.invalidateQueries({ queryKey: ["clean-candidates"] });
  };

  const items = data?.items ?? [];

  return (
    <DashboardShell
      title="ছবি থেকে ওয়াটারমার্ক অপসারণ"
      description="AI দিয়ে সোর্স আউটলেটের লোগো ও লেখা (যেমন যুগান্তর, World Tone) মুছে দিন।"
    >
      <Card className="p-4 mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            {isLoading
              ? "লোড হচ্ছে…"
              : `${items.length}টি প্রকাশিত আর্টিকেলের ছবি এখনও পরিষ্কার করা হয়নি।`}
          </div>
          {progress && (
            <div className="text-xs mt-1">
              অগ্রগতি: {progress.done} / {progress.total}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={!items.length || cleanMut.isPending}
            onClick={() => runBatch(items.slice(0, BATCH))}
          >
            {cleanMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            প্রথম {BATCH}টি পরিষ্কার করুন
          </Button>
          <Button
            disabled={!items.length || cleanMut.isPending}
            onClick={() => runBatch(items)}
          >
            {cleanMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            সব পরিষ্কার করুন ({items.length})
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((it) => (
          <Card key={it.id} className="overflow-hidden">
            <div className="aspect-video bg-muted relative">
              {it.featured_image ? (
                <img
                  src={it.featured_image}
                  alt={it.title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ImageOff className="w-6 h-6" />
                </div>
              )}
              {processingIds.has(it.id) && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> পরিষ্কার হচ্ছে…
                </div>
              )}
            </div>
            <div className="p-2 text-xs line-clamp-2 leading-snug">{it.title}</div>
          </Card>
        ))}
        {!isLoading && !items.length && (
          <div className="col-span-full text-center text-muted-foreground py-12">
            সব ছবি ইতিমধ্যেই পরিষ্কার করা হয়েছে।
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

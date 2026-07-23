import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, ImageOff, Check, X, Download, Eye } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  listCleanCandidates,
  cleanArticleImages,
  previewCleanArticleImage,
  acceptCleanedImage,
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

type PreviewState = {
  status: "idle" | "loading" | "ready" | "accepting" | "error";
  original?: string;
  cleaned?: string;
  error?: string;
};

async function triggerDownload(url: string, filename: string) {
  try {
    const res = await fetch(url, { credentials: "omit" });
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

function ImageCleanPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["clean-candidates"],
    queryFn: () => listCleanCandidates(),
  });
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [previews, setPreviews] = useState<Record<string, PreviewState>>({});

  const bulkMut = useMutation({
    mutationFn: (ids: string[]) => cleanArticleImages({ data: { ids } }),
  });

  const runBatch = async (batchItems: CleanCandidate[]) => {
    if (!batchItems.length) return;
    setProgress({ done: 0, total: batchItems.length });
    let done = 0;
    let creditsOut = false;
    for (let i = 0; i < batchItems.length; i += BATCH) {
      const chunk = batchItems.slice(i, i + BATCH);
      const ids = chunk.map((c) => c.id);
      setProcessingIds(new Set(ids));
      try {
        const res = await bulkMut.mutateAsync(ids);
        const okCount = res.results.filter((r) => r.ok).length;
        const failed = res.results.filter((r) => !r.ok);
        done += okCount;
        setProgress({ done, total: batchItems.length });
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

  const startPreview = async (it: CleanCandidate) => {
    setPreviews((p) => ({ ...p, [it.id]: { status: "loading" } }));
    try {
      const res = await previewCleanArticleImage({ data: { id: it.id } });
      if (!res.ok) {
        setPreviews((p) => ({ ...p, [it.id]: { status: "error", error: res.reason } }));
        toast.error(`প্রিভিউ ব্যর্থ: ${res.reason}`);
        return;
      }
      setPreviews((p) => ({
        ...p,
        [it.id]: { status: "ready", cleaned: res.url, original: res.original },
      }));
    } catch (e) {
      const msg = (e as Error).message;
      setPreviews((p) => ({ ...p, [it.id]: { status: "error", error: msg } }));
      toast.error(msg);
    }
  };

  const acceptPreview = async (it: CleanCandidate) => {
    const prev = previews[it.id];
    if (!prev?.cleaned) return;
    setPreviews((p) => ({ ...p, [it.id]: { ...prev, status: "accepting" } }));
    try {
      await acceptCleanedImage({ data: { id: it.id, url: prev.cleaned } });
      toast.success("গৃহীত হয়েছে।");
      setPreviews((p) => {
        const n = { ...p };
        delete n[it.id];
        return n;
      });
      qc.invalidateQueries({ queryKey: ["clean-candidates"] });
    } catch (e) {
      toast.error((e as Error).message);
      setPreviews((p) => ({ ...p, [it.id]: { ...prev, status: "ready" } }));
    }
  };

  const rejectPreview = (id: string) => {
    setPreviews((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
  };

  const items = data?.items ?? [];

  return (
    <DashboardShell title="ছবি থেকে ওয়াটারমার্ক অপসারণ">
      <Card className="p-4 mb-4 flex items-center justify-between gap-4 flex-wrap">
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
            disabled={!items.length || bulkMut.isPending}
            onClick={() => runBatch(items.slice(0, BATCH))}
          >
            {bulkMut.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            প্রথম {BATCH}টি স্বয়ংক্রিয়ভাবে
          </Button>
          <Button
            disabled={!items.length || bulkMut.isPending}
            onClick={() => runBatch(items)}
          >
            {bulkMut.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            সব স্বয়ংক্রিয়ভাবে ({items.length})
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => {
          const prev = previews[it.id];
          const isBulk = processingIds.has(it.id);
          const loading = prev?.status === "loading";
          const ready = prev?.status === "ready";
          const accepting = prev?.status === "accepting";
          return (
            <Card key={it.id} className="overflow-hidden flex flex-col">
              <div className="grid grid-cols-2 gap-px bg-border">
                <figure className="bg-muted">
                  <div className="text-[10px] uppercase tracking-wide px-2 py-1 bg-background/80 text-muted-foreground">
                    আগে
                  </div>
                  <div className="aspect-video relative">
                    {it.featured_image ? (
                      <img
                        src={it.featured_image}
                        alt={`মূল ছবি: ${it.title}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageOff className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                </figure>
                <figure className="bg-muted">
                  <div className="text-[10px] uppercase tracking-wide px-2 py-1 bg-background/80 text-muted-foreground">
                    পরে
                  </div>
                  <div className="aspect-video relative">
                    {ready && prev?.cleaned ? (
                      <img
                        src={prev.cleaned}
                        alt={`পরিষ্কার করা: ${it.title}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center px-2">
                        {loading || isBulk ? (
                          <span className="inline-flex items-center">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> পরিষ্কার হচ্ছে…
                          </span>
                        ) : prev?.status === "error" ? (
                          <span className="text-destructive">{prev.error}</span>
                        ) : (
                          "প্রিভিউ চালু করুন"
                        )}
                      </div>
                    )}
                  </div>
                </figure>
              </div>

              <div className="p-3 flex-1 flex flex-col gap-2">
                <div className="text-xs line-clamp-2 leading-snug">{it.title}</div>
                <div className="flex flex-wrap gap-2 mt-auto">
                  {!ready ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={loading || isBulk}
                      onClick={() => startPreview(it)}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4 mr-1" />
                      )}
                      প্রিভিউ
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        disabled={accepting}
                        onClick={() => acceptPreview(it)}
                      >
                        {accepting ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-1" />
                        )}
                        গ্রহণ
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={accepting}
                        onClick={() => rejectPreview(it.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        বাতিল
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          prev?.cleaned && triggerDownload(prev.cleaned, `${it.slug}-clean.jpg`)
                        }
                      >
                        <Download className="w-4 h-4 mr-1" />
                        ডাউনলোড
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {!isLoading && !items.length && (
          <div className="col-span-full text-center text-muted-foreground py-12">
            সব ছবি ইতিমধ্যেই পরিষ্কার করা হয়েছে।
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

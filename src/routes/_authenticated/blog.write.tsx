import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { createBlog } from "@/lib/blogs.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/blog/write")({
  component: WriteBlogPage,
});

function WriteBlogPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [cover, setCover] = useState("");

  const publish = useMutation({
    mutationFn: () =>
      createBlog({
        data: {
          title,
          content,
          excerpt: excerpt || undefined,
          cover_image: cover || undefined,
        },
      }),
    onSuccess: ({ slug }) => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast.success("ব্লগ প্রকাশিত হয়েছে!");
      navigate({ to: "/blog/$slug", params: { slug } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ব্লগ প্রকাশ করা যায়নি।"),
  });

  return (
    <SiteShell>
      <div className="container-news max-w-2xl py-8">
        <Link to="/blog" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> সব ব্লগ
        </Link>
        <h1 className="mb-6 font-bengali text-2xl font-bold">নতুন ব্লগ লিখুন</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim().length < 3) return toast.error("শিরোনাম খুব ছোট।");
            if (content.trim().length < 20) return toast.error("ব্লগের বিষয়বস্তু খুব ছোট।");
            publish.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="title">শিরোনাম</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          </div>
          <div>
            <Label htmlFor="cover">কভার ছবির লিংক (ঐচ্ছিক)</Label>
            <Input id="cover" type="url" value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label htmlFor="excerpt">সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)</Label>
            <Textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} maxLength={300} rows={2} className="resize-none" />
          </div>
          <div>
            <Label htmlFor="content">বিষয়বস্তু</Label>
            <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={12} required className="resize-y" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={publish.isPending}>
              {publish.isPending ? "প্রকাশ হচ্ছে..." : "প্রকাশ করুন"}
            </Button>
          </div>
        </form>
      </div>
    </SiteShell>
  );
}

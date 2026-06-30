import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, Trash2 } from "lucide-react";
import { getComments, addComment, deleteComment, type CommentItem } from "@/lib/comments.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/format";
import { toBengaliNumber } from "@/lib/format";

export function Comments({ articleId }: { articleId: string }) {
  const { user, isStaff } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  const queryKey = ["comments", articleId];
  const { data: comments = [] } = useQuery({
    queryKey,
    queryFn: () => getComments({ data: { articleId } }),
  });

  const add = useMutation({
    mutationFn: () => addComment({ data: { articleId, content: text } }),
    onSuccess: (created: CommentItem) => {
      queryClient.setQueryData<CommentItem[]>(queryKey, (prev) => [created, ...(prev ?? [])]);
      setText("");
      toast.success("মন্তব্য প্রকাশিত হয়েছে।");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "মন্তব্য জমা দেওয়া যায়নি।"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteComment({ data: { id } }),
    onSuccess: (_d, id) => {
      queryClient.setQueryData<CommentItem[]>(queryKey, (prev) => (prev ?? []).filter((c) => c.id !== id));
      toast.success("মন্তব্য মুছে ফেলা হয়েছে।");
    },
    onError: () => toast.error("মন্তব্য মুছে ফেলা যায়নি।"),
  });

  return (
    <section className="container-news max-w-3xl border-t pb-16 pt-8">
      <h2 className="mb-5 flex items-center gap-2 font-bengali text-xl font-bold">
        <MessageCircle className="h-5 w-5 text-primary" />
        মন্তব্য ({toBengaliNumber(comments.length)})
      </h2>

      {user ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) add.mutate();
          }}
          className="mb-8"
        >
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="আপনার মতামত লিখুন..."
            maxLength={2000}
            rows={3}
            className="resize-none"
          />
          <div className="mt-2 flex justify-end">
            <Button type="submit" size="sm" disabled={!text.trim() || add.isPending}>
              {add.isPending ? "জমা হচ্ছে..." : "মন্তব্য করুন"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mb-8 rounded-lg border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
          মন্তব্য করতে{" "}
          <Link to="/auth" className="font-medium text-primary hover:underline">
            লগইন
          </Link>{" "}
          করুন।
        </div>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">এখনো কোনো মন্তব্য নেই। প্রথম মন্তব্যটি আপনিই করুন।</p>
      ) : (
        <ul className="space-y-5">
          {comments.map((c) => (
            <li key={c.id} className="border-b pb-4 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{c.author_name}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                </div>
                {(user?.id === c.user_id || isStaff) && (
                  <button
                    onClick={() => remove.mutate(c.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="মন্তব্য মুছুন"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-1.5 whitespace-pre-line text-[15px] leading-7 text-foreground">{c.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

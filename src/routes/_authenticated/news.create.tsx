import { createFileRoute } from "@tanstack/react-router";
import { ArticleEditor } from "@/components/dashboard/ArticleEditor";

export const Route = createFileRoute("/_authenticated/news/create")({
  component: () => <ArticleEditor />,
});

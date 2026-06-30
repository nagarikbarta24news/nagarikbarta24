import { createFileRoute } from "@tanstack/react-router";
import { ArticleEditor } from "@/components/dashboard/ArticleEditor";

export const Route = createFileRoute("/_authenticated/news/edit/$id")({
  component: EditPage,
});

function EditPage() {
  const { id } = Route.useParams();
  return <ArticleEditor id={id} />;
}

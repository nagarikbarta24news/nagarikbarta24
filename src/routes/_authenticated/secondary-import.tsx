import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { secondaryPreview, secondaryImport } from "@/lib/secondary-import.functions";

export const Route = createFileRoute("/_authenticated/secondary-import")({
  component: SecondaryImportPage,
  head: () => ({
    meta: [{ title: "সেকেন্ডারি Supabase ইমপোর্ট | নাগরিক বার্তা ২৪" }],
  }),
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-red-600">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

type Row = Record<string, unknown>;

function SecondaryImportPage() {
  const router = useRouter();
  const preview = useServerFn(secondaryPreview);
  const importFn = useServerFn(secondaryImport);

  const [table, setTable] = useState("articles");
  const [orderBy, setOrderBy] = useState("created_at");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const [map, setMap] = useState({
    title: "title",
    slug: "slug",
    content: "content",
    excerpt: "excerpt",
    featured_image: "featured_image",
    published_at: "published_at",
    source_url: "source_url",
  });
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState(25);

  const columns = rows.length ? Object.keys(rows[0] as object) : [];

  const runPreview = async () => {
    setBusy(true);
    try {
      const res = await preview({ data: { table, limit: 10, orderBy: orderBy || undefined, ascending: false } });
      setRows(res.rows as Row[]);
      toast.success(`${res.count} row(s) fetched`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    setBusy(true);
    try {
      const res = await importFn({
        data: {
          table,
          limit,
          orderBy: orderBy || undefined,
          ascending: false,
          fieldMap: map,
          status,
          categoryId: categoryId ? Number(categoryId) : undefined,
        },
      });
      toast.success(`Imported ${res.imported} · Skipped ${res.skipped}`);
      router.invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell title="সেকেন্ডারি Supabase → আর্টিকেল ইমপোর্ট">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>সোর্স (secondary project)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Table name</Label>
                <Input value={table} onChange={(e) => setTable(e.target.value)} />
              </div>
              <div>
                <Label>Order by (desc)</Label>
                <Input value={orderBy} onChange={(e) => setOrderBy(e.target.value)} />
              </div>
            </div>
            <Button onClick={runPreview} disabled={busy}>
              Preview 10 rows
            </Button>
            {columns.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Columns: {columns.join(", ")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ফিল্ড ম্যাপিং → articles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(Object.keys(map) as Array<keyof typeof map>).map((k) => (
              <div key={k} className="grid grid-cols-3 items-center gap-2">
                <Label className="text-xs">{k}</Label>
                <Input
                  className="col-span-2"
                  value={map[k]}
                  placeholder="source column"
                  onChange={(e) => setMap({ ...map, [k]: e.target.value })}
                />
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div>
                <Label className="text-xs">Status</Label>
                <select
                  className="w-full rounded border px-2 py-1 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "draft" | "published")}
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Category ID</Label>
                <Input value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="(optional)" />
              </div>
              <div>
                <Label className="text-xs">Limit</Label>
                <Input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(Math.max(1, Math.min(200, Number(e.target.value) || 25)))}
                />
              </div>
            </div>
            <Button onClick={runImport} disabled={busy} className="mt-2 w-full">
              Import → articles (upsert on slug)
            </Button>
          </CardContent>
        </Card>
      </div>

      {rows.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <pre className="max-h-[420px] whitespace-pre-wrap text-xs">
              {JSON.stringify(rows.slice(0, 5), null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}

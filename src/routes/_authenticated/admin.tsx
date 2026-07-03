import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/hooks/use-auth";
import { listStaff, setUserRole, upsertCategory } from "@/lib/admin.functions";
import { listAllCategories } from "@/lib/cms.functions";
import { getFooterCredit, updateFooterCredit, DEFAULT_FOOTER_CREDIT } from "@/lib/settings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

const ROLES: { value: any; label: string }[] = [
  { value: "reporter", label: "সাংবাদিক" },
  { value: "editor", label: "সম্পাদক" },
  { value: "chief_editor", label: "প্রধান সম্পাদক" },
  { value: "admin", label: "অ্যাডমিন" },
];

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();

  if (loading) return <DashboardShell title="অ্যাডমিন প্যানেল"><p className="text-muted-foreground">লোড হচ্ছে...</p></DashboardShell>;
  if (!isAdmin)
    return (
      <DashboardShell title="অ্যাডমিন প্যানেল">
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          এই পেজ দেখার অনুমতি আপনার নেই।
        </div>
      </DashboardShell>
    );

  return (
    <DashboardShell title="অ্যাডমিন প্যানেল">
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">ব্যবহারকারী ও ভূমিকা</TabsTrigger>
          <TabsTrigger value="cats">বিভাগ ব্যবস্থাপনা</TabsTrigger>
          <TabsTrigger value="footer">ফুটার ক্রেডিট</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="cats"><CategoriesTab /></TabsContent>
        <TabsContent value="footer"><FooterCreditTab /></TabsContent>
      </Tabs>
    </DashboardShell>
  );

  function UsersTab() {
    const { data: staff } = useQuery({ queryKey: ["admin-staff"], queryFn: () => listStaff() });
    const toggle = useMutation({
      mutationFn: (v: { userId: string; role: any; enabled: boolean }) => setUserRole({ data: v }),
      onSuccess: () => {
        toast.success("ভূমিকা আপডেট হয়েছে।");
        qc.invalidateQueries({ queryKey: ["admin-staff"] });
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "আপডেট ব্যর্থ।"),
    });

    return (
      <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="p-3 font-medium">ব্যবহারকারী</th>
              <th className="p-3 font-medium">বর্তমান ভূমিকা</th>
              <th className="p-3 font-medium">ভূমিকা নির্ধারণ</th>
            </tr>
          </thead>
          <tbody>
            {(staff ?? []).map((u: any) => (
              <tr key={u.id} className="border-b last:border-0 align-top">
                <td className="p-3">
                  <span className="font-medium">{u.bangla_name || u.full_name || "নামহীন"}</span>
                  <p className="text-xs text-muted-foreground">{u.full_name}</p>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length ? u.roles.map((r: string) => <Badge key={r} variant="secondary">{r}</Badge>) : <span className="text-muted-foreground">—</span>}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {ROLES.map((r) => {
                      const active = u.roles.includes(r.value);
                      return (
                        <Button
                          key={r.value}
                          size="sm"
                          variant={active ? "default" : "outline"}
                          onClick={() => toggle.mutate({ userId: u.id, role: r.value, enabled: !active })}
                        >
                          {r.label}
                        </Button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function CategoriesTab() {
    const { data: cats } = useQuery({ queryKey: ["cms-cats"], queryFn: () => listAllCategories() });
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const add = useMutation({
      mutationFn: () => upsertCategory({ data: { name, slug, priority: (cats?.length ?? 0) + 1, is_active: true } }),
      onSuccess: () => {
        toast.success("বিভাগ যুক্ত হয়েছে।");
        setName(""); setSlug("");
        qc.invalidateQueries({ queryKey: ["cms-cats"] });
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "যুক্ত করতে ব্যর্থ।"),
    });

    return (
      <div className="mt-4 grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 font-bengali font-bold">নতুন বিভাগ</h3>
          <Label>নাম (বাংলা)</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Label className="mt-3 block">স্লাগ (ইংরেজি)</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="technology" />
          <Button className="mt-4 w-full" onClick={() => add.mutate()} disabled={!name || !slug || add.isPending}>
            যুক্ত করুন
          </Button>
        </div>
        <div className="rounded-lg border bg-card p-4 md:col-span-2">
          <h3 className="mb-3 font-bengali font-bold">বিদ্যমান বিভাগ</h3>
          <div className="space-y-2">
            {(cats ?? []).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="font-medium">{c.name} <span className="text-muted-foreground">/{c.slug}</span></span>
                <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

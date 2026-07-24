import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/hooks/use-auth";
import { listStaff, setUserRole, upsertCategory } from "@/lib/admin.functions";
import { listAllCategories } from "@/lib/cms.functions";
import { getFooterCredit, updateFooterCredit, DEFAULT_FOOTER_CREDIT, getFooterTheme, updateFooterTheme, DEFAULT_FOOTER_THEME, FOOTER_THEME_PRESETS, type FooterTheme } from "@/lib/settings.functions";
import {
  listNewsletterSubscribers,
  listNewsletterIssues,
  createNewsletterIssue,
  sendNewsletterIssue,
} from "@/lib/newsletter.functions";
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
          <TabsTrigger value="theme">ফুটার থিম</TabsTrigger>
          <TabsTrigger value="newsletter">নিউজলেটার</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="cats"><CategoriesTab /></TabsContent>
        <TabsContent value="footer"><FooterCreditTab /></TabsContent>
        <TabsContent value="theme"><FooterThemeTab /></TabsContent>
        <TabsContent value="newsletter"><NewsletterTab /></TabsContent>

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
    const [displayOrder, setDisplayOrder] = useState("0");
    const add = useMutation({
      mutationFn: () => upsertCategory({ data: { name, slug, priority: (cats?.length ?? 0) + 1, display_order: Number(displayOrder) || 0, is_active: true } }),
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
          <Label className="mt-3 block">প্রদর্শন ক্রম (ছোট = আগে)</Label>
          <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} placeholder="0" />
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

  function FooterCreditTab() {
    const { data } = useQuery({ queryKey: ["footer-credit-admin"], queryFn: () => getFooterCredit() });
    const [form, setForm] = useState(DEFAULT_FOOTER_CREDIT);
    const [ready, setReady] = useState(false);
    if (data && !ready) {
      setForm({ name: data.name, title: data.title, org: data.org, url: data.url });
      setReady(true);
    }
    const save = useMutation({
      mutationFn: () => updateFooterCredit({ data: form }),
      onSuccess: () => {
        toast.success("ফুটার ক্রেডিট সংরক্ষণ হয়েছে।");
        qc.invalidateQueries({ queryKey: ["footer-credit"] });
        qc.invalidateQueries({ queryKey: ["footer-credit-admin"] });
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "সংরক্ষণ ব্যর্থ।"),
    });

    return (
      <div className="mt-4 max-w-lg rounded-lg border bg-card p-4">
        <h3 className="mb-1 font-bengali font-bold">ফুটার ক্রেডিট সম্পাদনা</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          সাইটের ফুটারে দেখানো "ডিজাইন ও ডেভেলপমেন্ট" অ্যাট্রিবিউশন এখানে পরিবর্তন করুন।
        </p>
        <Label>নাম</Label>
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <Label className="mt-3 block">টাইটেল</Label>
        <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Brand Architect" />
        <Label className="mt-3 block">প্রতিষ্ঠান</Label>
        <Input value={form.org} onChange={(e) => setForm((f) => ({ ...f, org: e.target.value }))} placeholder="Trend Flux Digital" />
        <Label className="mt-3 block">লিঙ্ক (URL)</Label>
        <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://trendflux.digital/" />
        <Button className="mt-4 w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>
          সংরক্ষণ করুন
        </Button>
    </div>
  );
}

function FooterThemeTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["footer-theme-admin"], queryFn: () => getFooterTheme() });
  const [form, setForm] = useState<FooterTheme>(DEFAULT_FOOTER_THEME);
  const [ready, setReady] = useState(false);
  if (data && !ready) {
    setForm({ background: data.background, foreground: data.foreground, muted: data.muted });
    setReady(true);
  }
  const save = useMutation({
    mutationFn: () => updateFooterTheme({ data: form }),
    onSuccess: () => {
      toast.success("ফুটার থিম সংরক্ষণ হয়েছে।");
      qc.invalidateQueries({ queryKey: ["footer-theme"] });
      qc.invalidateQueries({ queryKey: ["footer-theme-admin"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "সংরক্ষণ ব্যর্থ।"),
  });

  const previewStyle = {
    backgroundColor: form.background,
    color: form.foreground,
  } as React.CSSProperties;

  return (
    <div className="mt-4 grid max-w-3xl gap-6 lg:grid-cols-2">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-1 font-bengali font-bold">ফুটার থিম কাস্টমাইজেশন</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          ফুটারের background, টেক্সট এবং muted রং পরিবর্তন করুন। এখানে সেট করা রং সাইটের CSS টোকেন (<code>--footer</code>, <code>--footer-foreground</code>, <code>--footer-muted</code>) override করে।
        </p>

        <Label className="mb-2 block">প্রিসেট থেকে বেছে নিন</Label>
        <div className="mb-4 flex flex-wrap gap-2">
          {FOOTER_THEME_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setForm(p.theme)}
              className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs transition hover:border-primary"
            >
              <span className="inline-block h-4 w-4 rounded" style={{ backgroundColor: p.theme.background }} />
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setForm(DEFAULT_FOOTER_THEME)}
            className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:border-primary"
          >
            ডিফল্টে ফিরুন
          </button>
        </div>

        <Label>Background (গাঢ় নীল ইত্যাদি)</Label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="color"
            value={form.background}
            onChange={(e) => setForm((f) => ({ ...f, background: e.target.value }))}
            className="h-9 w-14 cursor-pointer rounded border"
            aria-label="ফুটার background রং"
          />
          <Input value={form.background} onChange={(e) => setForm((f) => ({ ...f, background: e.target.value }))} placeholder="#0b1c3a" />
        </div>

        <Label className="mt-3 block">Foreground (টেক্সটের রং)</Label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="color"
            value={form.foreground}
            onChange={(e) => setForm((f) => ({ ...f, foreground: e.target.value }))}
            className="h-9 w-14 cursor-pointer rounded border"
            aria-label="ফুটার foreground রং"
          />
          <Input value={form.foreground} onChange={(e) => setForm((f) => ({ ...f, foreground: e.target.value }))} placeholder="#f5f8ff" />
        </div>

        <Label className="mt-3 block">Muted (সেকেন্ডারি টেক্সট)</Label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="color"
            value={form.muted}
            onChange={(e) => setForm((f) => ({ ...f, muted: e.target.value }))}
            className="h-9 w-14 cursor-pointer rounded border"
            aria-label="ফুটার muted রং"
          />
          <Input value={form.muted} onChange={(e) => setForm((f) => ({ ...f, muted: e.target.value }))} placeholder="#b8c4dc" />
        </div>

        <Button className="mt-4 w-full" onClick={() => save.mutate()} disabled={save.isPending}>
          সংরক্ষণ করুন
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h4 className="mb-2 text-sm font-semibold text-muted-foreground">লাইভ প্রিভিউ</h4>
        <div className="rounded-md p-6" style={previewStyle}>
          <p className="text-lg font-semibold">নাগরিক বার্তা ২৪</p>
          <p className="mt-1 text-sm" style={{ color: form.muted }}>
            নির্ভরযোগ্য, নিরপেক্ষ ও তথ্যবহুল সংবাদ পরিবেশনের অঙ্গীকার।
          </p>
          <p className="mt-3 text-xs" style={{ color: form.muted }}>
            © {new Date().getFullYear()} সর্বস্বত্ব সংরক্ষিত।
          </p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          সংরক্ষণের পর পুরো সাইটের ফুটারে এই রং প্রয়োগ হবে (SSR ও CSR উভয় জায়গায়)।
        </p>
      </div>
    </div>
  );
}



function NewsletterTab() {
  const qc = useQueryClient();
  const { data: subscribers } = useQuery({
    queryKey: ["newsletter-subscribers"],
    queryFn: () => listNewsletterSubscribers(),
  });
  const { data: issues } = useQuery({
    queryKey: ["newsletter-issues"],
    queryFn: () => listNewsletterIssues(),
  });
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");

  const create = useMutation({
    mutationFn: () => createNewsletterIssue({ data: { subject, bodyHtml, articleIds: [] } }),
    onSuccess: () => {
      toast.success("নিউজলেটার ড্রাফ্ট তৈরি হয়েছে।");
      setSubject("");
      setBodyHtml("");
      qc.invalidateQueries({ queryKey: ["newsletter-issues"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "তৈরি ব্যর্থ।"),
  });

  const send = useMutation({
    mutationFn: (issueId: string) => sendNewsletterIssue({ data: { issueId } }),
    onSuccess: (res) => {
      toast.success(`${res.sent} জন পাঠকের কাছে নিউজলেটার পাঠানো হয়েছে।`);
      qc.invalidateQueries({ queryKey: ["newsletter-issues"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "পাঠানো ব্যর্থ।"),
  });

  const confirmed = (subscribers ?? []).filter((s: any) => s.status === "confirmed").length;
  const pending = (subscribers ?? []).filter((s: any) => s.status === "pending").length;

  return (
    <div className="mt-4 grid gap-6 md:grid-cols-3">
      <div className="rounded-lg border bg-card p-4 md:col-span-2">
        <h3 className="mb-3 font-bengali font-bold">নতুন নিউজলেটার</h3>
        <Label>সাবজেক্ট</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="আজকের সেরা খবর" />
        <Label className="mt-3 block">বডি (HTML)</Label>
        <textarea
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          placeholder="<h2>আজকের শিরোনাম</h2><p>...</p>"
          className="mt-1 min-h-[160px] w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <Button
          className="mt-4 w-full"
          onClick={() => create.mutate()}
          disabled={!subject || !bodyHtml || create.isPending}
        >
          ড্রাফ্ট তৈরি করুন
        </Button>
      </div>
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 font-bengali font-bold">সাবস্ক্রাইবার</h3>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">নিশ্চিত</span>
            <span className="font-semibold">{confirmed}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">পেন্ডিং</span>
            <span className="font-semibold">{pending}</span>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 font-bengali font-bold">প্রেরিত ক্যাম্পেইন</h3>
          <div className="max-h-60 space-y-2 overflow-auto">
            {(issues ?? []).map((issue: any) => (
              <div key={issue.id} className="rounded-md border px-3 py-2 text-sm">
                <p className="font-medium">{issue.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {issue.status === "sent" ? `${issue.sent_count} পাঠকে পাঠানো` : "ড্রাফ্ট"}
                </p>
                {issue.status === "draft" && (
                  <Button
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => send.mutate(issue.id)}
                    disabled={send.isPending}
                  >
                    পাঠান
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
}

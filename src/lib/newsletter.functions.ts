import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().trim().email().max(255),
});

const tokenSchema = z.object({
  token: z.string().trim().min(1),
});

const issueSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  bodyHtml: z.string().trim().min(1),
  articleIds: z.array(z.string().uuid()).default([]),
});

const sendIssueSchema = z.object({
  issueId: z.string().uuid(),
});

function serverSupabase() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((input) => emailSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = serverSupabase();
    const token = crypto.randomUUID().replace(/-/g, "");
    const unsubscribeToken = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("newsletter_subscribers").insert({
      email: data.email,
      status: "pending",
      confirmation_token: token,
      unsubscribe_token: unsubscribeToken,
    });
    if (error) {
      if (error.code === "23505") {
        return { ok: true, message: "আপনি ইতিমধ্যে সাবস্ক্রাইব করেছেন।" };
      }
      throw new Error(error.message);
    }

    const confirmUrl = `https://nagarikbarta24.com/newsletter/confirm?token=${encodeURIComponent(token)}`;
    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: JSON.stringify({
        template_name: "newsletter-issue",
        to: data.email,
        subject: "নিউজলেটার সাবস্ক্রিপশন নিশ্চিতকরণ — নাগরিক বার্তা ২৪",
        html: `<p>আপনার নিউজলেটার সাবস্ক্রিপশন নিশ্চিত করতে নিচের লিংকে ক্লিক করুন:</p><p><a href="${confirmUrl}">${confirmUrl}</a></p><p>আপনি যদি সাবস্ক্রাইব না করে থাকেন, এই ইমেইলটি উপেক্ষা করুন।</p>`,
        metadata: { purpose: "newsletter-confirmation", confirmation_token: token },
      }),
    });

    return { ok: true, token };
  });

export const confirmNewsletter = createServerFn({ method: "POST" })
  .inputValidator((input) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = serverSupabase();
    const { data: result, error } = await supabase.rpc("confirm_newsletter_subscription", {
      _token: data.token,
    });
    if (error) throw new Error(error.message);
    return { ok: result === true };
  });

export const unsubscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((input) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = serverSupabase();
    const { data: result, error } = await supabase.rpc("unsubscribe_newsletter", {
      _token: data.token,
    });
    if (error) throw new Error(error.message);
    return { ok: result === true };
  });

export const listNewsletterSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden: শুধুমাত্র অ্যাডমিন দেখতে পারবেন।");
    const { data, error } = await context.supabase
      .from("newsletter_subscribers")
      .select("id, email, status, created_at, confirmed_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createNewsletterIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => issueSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: issue, error } = await context.supabase
      .from("newsletter_issues")
      .insert({
        subject: data.subject,
        body_html: data.bodyHtml,
        article_ids: data.articleIds,
        status: "draft",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return issue;
  });

export const listNewsletterIssues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("newsletter_issues")
      .select("id, subject, status, sent_at, sent_count, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const sendNewsletterIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => sendIssueSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: issue, error: issueError } = await context.supabase
      .from("newsletter_issues")
      .select("*")
      .eq("id", data.issueId)
      .single();
    if (issueError || !issue) throw new Error(issueError?.message ?? "Issue not found");

    const { data: subs, error: subsError } = await context.supabase
      .from("newsletter_subscribers")
      .select("email, unsubscribe_token")
      .eq("status", "confirmed");
    if (subsError) throw new Error(subsError.message);

    const [{ render }, { template }] = await Promise.all([
      import("@react-email/render"),
      import("@/lib/email-templates/newsletter-issue"),
    ]);

    const recipients = subs ?? [];
    let sent = 0;

    for (const r of recipients) {
      const unsubscribeUrl = `https://nagarikbarta24.com/unsubscribe?token=${encodeURIComponent(r.unsubscribe_token)}`;
      const html = await render(
        template.component({
          subject: issue.subject,
          preview: issue.subject,
          bodyHtml: issue.body_html,
          articles: [],
          unsubscribeUrl,
        })
      );
      const { error: sendError } = await context.supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: JSON.stringify({
          to: r.email,
          subject: issue.subject,
          html,
          idempotency_key: `newsletter-${issue.id}-${r.email}`,
          label: "newsletter-issue",
        }),
      });
      if (!sendError) sent++;
    }

    await context.supabase
      .from("newsletter_issues")
      .update({ status: "sent", sent_at: new Date().toISOString(), sent_count: sent })
      .eq("id", data.issueId);

    return { ok: true, sent, total: recipients.length };
  });

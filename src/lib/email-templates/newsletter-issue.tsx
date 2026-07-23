import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Article {
  id: string;
  title: string;
  slug: string;
  summary?: string;
}

interface Props {
  subject?: string;
  preview?: string;
  bodyHtml?: string;
  articles?: Article[];
  unsubscribeUrl?: string;
}

const SITE_URL = "https://nagarikbarta24.com";

export const Email = ({
  subject,
  preview,
  bodyHtml,
  articles,
  unsubscribeUrl,
}: Props) => {
  const safeBody = bodyHtml ?? "";
  const articleList = articles ?? [];
  return (
    <Html lang="bn" dir="ltr">
      <Head />
      <Preview>{preview || subject || "আজকের সেরা খবর"}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading as="h1" style={h1}>
            {subject || "নাগরিক বার্তা ২৪"}
          </Heading>

          {safeBody && (
            <Section style={bodySection}>
              <div dangerouslySetInnerHTML={{ __html: safeBody }} />
            </Section>
          )}

          {articleList.length > 0 && (
            <Section style={articleSection}>
              <Heading as="h2" style={h2}>
                আজকের শিরোনাম
              </Heading>
              {articleList.map((article) => (
                <div key={article.id} style={articleItem}>
                  <Link
                    href={`${SITE_URL}/article/${article.slug}`}
                    style={articleTitle}
                  >
                    {article.title}
                  </Link>
                  {article.summary && (
                    <Text style={articleSummary}>{article.summary}</Text>
                  )}
                </div>
              ))}
            </Section>
          )}

          <Text style={footer}>
            নাগরিক বার্তা ২৪ থেকে পাঠানো হয়েছে।{" "}
            {unsubscribeUrl ? (
              <Link href={unsubscribeUrl} style={unsubscribeLink}>
                আনসাবস্ক্রাইব করুন
              </Link>
            ) : null}
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: Email,
  subject: (data: Props) => data.subject || "আজকের সেরা খবর",
  displayName: "Newsletter Issue",
  previewData: {
    subject: "আজকের সেরা খবর",
    preview: "প্রতিদিনের সেরা খবর সরাসরি ইমেইলে",
    bodyHtml: "<p>নাগরিক বার্তা ২৪-এর নিয়মিত নিউজলেটারে আপনাকে স্বাগতম।</p>",
    articles: [
      {
        id: "preview-1",
        title: "শিরোনাম ১",
        slug: "shirnam-1",
        summary: "সংক্ষিপ্ত বিবরণ",
      },
    ],
    unsubscribeUrl: "https://nagarikbarta24.com/unsubscribe?token=preview",
  },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    "'Hind Siliguri', 'Noto Sans Bengali', Arial, sans-serif",
  padding: "20px 0",
};

const container = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "28px 24px",
  maxWidth: "600px",
};

const h1 = {
  color: "#1e3a5f",
  fontSize: "22px",
  fontWeight: 700,
  margin: "0 0 20px",
  lineHeight: 1.4,
};

const h2 = {
  color: "#1e3a5f",
  fontSize: "18px",
  fontWeight: 600,
  margin: "0 0 14px",
  borderBottom: "2px solid #e5e7eb",
  paddingBottom: "8px",
};

const bodySection = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: 1.7,
  marginBottom: "24px",
};

const articleSection = {
  marginBottom: "24px",
};

const articleItem = {
  marginBottom: "16px",
};

const articleTitle = {
  color: "#2563eb",
  fontSize: "16px",
  fontWeight: 600,
  textDecoration: "none",
  lineHeight: 1.5,
};

const articleSummary = {
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: 1.5,
  margin: "6px 0 0",
};

const footer = {
  color: "#6b7280",
  fontSize: "13px",
  textAlign: "center" as const,
  marginTop: "24px",
  borderTop: "1px solid #e5e7eb",
  paddingTop: "16px",
};

const unsubscribeLink = {
  color: "#6b7280",
  textDecoration: "underline",
};

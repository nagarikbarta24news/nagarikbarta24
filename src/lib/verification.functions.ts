import { createServerFn } from "@tanstack/react-start";

// The verification token we expect to be live in the production HTML head.
// Keep in sync with the <meta name="google-site-verification"> in __root.tsx.
const EXPECTED_TOKEN = "ALKSWH_-RiuN_4WyIEEWhN0OHmDXHRfsmPK9SttCBlQ";
const LIVE_URL = "https://nagarikbarta24.news/";

export type VerificationCheck = {
  pass: boolean;
  expected: string;
  found: string[];
  matched: boolean;
  httpStatus: number | null;
  checkedAt: string;
  message: string;
};

export const checkVerificationToken = createServerFn({ method: "GET" }).handler(
  async (): Promise<VerificationCheck> => {
    const checkedAt = new Date().toISOString();
    try {
      const res = await fetch(LIVE_URL, {
        headers: { "User-Agent": "NagarikBarta-VerificationCheck/1.0" },
      });
      const html = await res.text();

      // Collect every google-site-verification content value in the head.
      const found: string[] = [];
      const re =
        /name=["']google-site-verification["']\s+content=["']([^"']+)["']/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) found.push(m[1]);
      // also handle content-before-name ordering
      const re2 =
        /content=["']([^"']+)["']\s+name=["']google-site-verification["']/gi;
      while ((m = re2.exec(html)) !== null) found.push(m[1]);

      const matched = found.includes(EXPECTED_TOKEN);
      const pass = res.ok && matched;

      return {
        pass,
        expected: EXPECTED_TOKEN,
        found: Array.from(new Set(found)),
        matched,
        httpStatus: res.status,
        checkedAt,
        message: pass
          ? "PASS — verification token is live on the domain."
          : matched
            ? `FAIL — token present but page returned HTTP ${res.status}.`
            : found.length
              ? "FAIL — a different verification token is live."
              : "FAIL — no verification token found on the live domain.",
      };
    } catch (err) {
      return {
        pass: false,
        expected: EXPECTED_TOKEN,
        found: [],
        matched: false,
        httpStatus: null,
        checkedAt,
        message: `FAIL — could not reach the domain: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }
  },
);

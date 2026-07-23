import { describe, it, expect } from "vitest";
import { buildFinalContent, GREETING_HEADING, GREETING_MARKER_START, GREETING_MARKER_END } from "./greeting";

const countHeading = (s: string) => s.split(GREETING_HEADING).length - 1;

describe("buildFinalContent", () => {
  it("appends greeting block when none exists", () => {
    const out = buildFinalContent("মূল কন্টেন্ট।", "স্বাগতম!");
    expect(out).toContain(GREETING_HEADING);
    expect(out).toContain("স্বাগতম!");
    expect(out).toContain(GREETING_MARKER_START);
    expect(out).toContain(GREETING_MARKER_END);
    expect(countHeading(out)).toBe(1);
  });

  it("returns content unchanged when greeting is empty", () => {
    expect(buildFinalContent("hello", "")).toBe("hello");
    expect(buildFinalContent("hello", "   ")).toBe("hello");
    expect(buildFinalContent("hello", null)).toBe("hello");
    expect(buildFinalContent("hello", undefined)).toBe("hello");
  });

  it("handles null/undefined content", () => {
    expect(buildFinalContent(null, "")).toBe("");
    expect(buildFinalContent(undefined, "hi")).toContain("hi");
  });

  it("does not duplicate the heading on repeated edits with same greeting", () => {
    let content = "মূল কন্টেন্ট।";
    for (let i = 0; i < 5; i++) {
      content = buildFinalContent(content, "স্বাগতম!");
      expect(countHeading(content)).toBe(1);
    }
  });

  it("replaces existing greeting when greeting text changes", () => {
    let content = buildFinalContent("বডি", "পুরাতন বার্তা");
    content = buildFinalContent(content, "নতুন বার্তা");
    expect(countHeading(content)).toBe(1);
    expect(content).toContain("নতুন বার্তা");
    expect(content).not.toContain("পুরাতন বার্তা");
    expect(content).toContain("বডি");
  });

  it("removes the greeting block when greeting is cleared", () => {
    const withGreeting = buildFinalContent("বডি", "hi");
    const cleared = buildFinalContent(withGreeting, "");
    expect(countHeading(cleared)).toBe(0);
    expect(cleared).toBe("বডি");
  });

  it("preserves in-body prose that legitimately mentions the greeting phrase", () => {
    // Regression: previously any occurrence of the heading in body prose was
    // truncated on save. The phrase must survive when it is not an appended
    // auto-block.
    const body = `আজকের প্রতিবেদন: ${GREETING_HEADING} বিনিময়ের অনুষ্ঠান অনুষ্ঠিত হয়েছে।\n\nপরবর্তী অনুচ্ছেদে বিস্তারিত রয়েছে।`;
    const out = buildFinalContent(body, "");
    expect(out).toBe(body);
    expect(countHeading(out)).toBe(1);
    // And with a greeting set, body prose is still preserved.
    const withG = buildFinalContent(body, "শুভেচ্ছা!");
    expect(withG).toContain("বিনিময়ের অনুষ্ঠান");
    expect(withG).toContain("পরবর্তী অনুচ্ছেদে বিস্তারিত");
    expect(withG).toContain("শুভেচ্ছা!");
    // Repeated saves stay stable and never eat the body.
    let cycle = withG;
    for (let i = 0; i < 4; i++) {
      cycle = buildFinalContent(cycle, "শুভেচ্ছা!");
      expect(cycle).toContain("বিনিময়ের অনুষ্ঠান");
      expect(cycle).toContain("পরবর্তী অনুচ্ছেদে বিস্তারিত");
      expect(countHeading(cycle)).toBe(2); // one in body, one in auto block
    }
  });

  it("cleans up legacy unmarked greeting blocks across repeated edits", () => {
    // Legacy save format: heading appended at the tail without markers.
    const legacy = `বডি\n\n${GREETING_HEADING}\nA`;
    const out = buildFinalContent(legacy, "C");
    expect(countHeading(out)).toBe(1);
    expect(out).toContain("C");
    expect(out).not.toContain("\nA");
  });

  it("preserves user body content across many edits", () => {
    const body = "গুরুত্বপূর্ণ বডি কন্টেন্ট।";
    let content = body;
    const greetings = ["এক", "দুই", "তিন", "চার", "পাঁচ"];
    for (const g of greetings) {
      content = buildFinalContent(content, g);
    }
    expect(countHeading(content)).toBe(1);
    expect(content.startsWith(body)).toBe(true);
    expect(content).toContain("পাঁচ");
    expect(content).not.toContain("এক\n");
  });

  it("trims trailing whitespace before appending", () => {
    const out = buildFinalContent("বডি   \n\n\n", "hi");
    expect(out.startsWith("বডি\n\n")).toBe(true);
    expect(out).toContain("hi");
    expect(out).toContain(GREETING_MARKER_START);
  });
});

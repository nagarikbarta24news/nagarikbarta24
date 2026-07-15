import { describe, it, expect } from "vitest";
import { buildFinalContent, GREETING_HEADING } from "./greeting";

const countHeading = (s: string) => s.split(GREETING_HEADING).length - 1;

describe("buildFinalContent", () => {
  it("appends greeting block when none exists", () => {
    const out = buildFinalContent("মূল কন্টেন্ট।", "স্বাগতম!");
    expect(out).toContain(GREETING_HEADING);
    expect(out.endsWith("স্বাগতম!")).toBe(true);
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

  it("strips only from the first heading occurrence (no stacking from prior duplicates)", () => {
    // Simulate legacy content that already accidentally contained two blocks.
    const legacy = `বডি\n\n${GREETING_HEADING}\nA\n\n${GREETING_HEADING}\nB`;
    const out = buildFinalContent(legacy, "C");
    expect(countHeading(out)).toBe(1);
    expect(out).toContain("C");
    expect(out).not.toContain("\nA");
    expect(out).not.toContain("\nB");
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
    expect(content.endsWith("পাঁচ")).toBe(true);
  });

  it("trims trailing whitespace before appending", () => {
    const out = buildFinalContent("বডি   \n\n\n", "hi");
    expect(out).toBe(`বডি\n\n${GREETING_HEADING}\nhi`);
  });
});

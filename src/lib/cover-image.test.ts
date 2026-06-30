import { describe, it, expect } from "vitest";
import { coverImage } from "./cover-image";

import catNational from "@/assets/cat-national.jpg";
import catEconomy from "@/assets/cat-economy.jpg";
import catSports from "@/assets/cat-sports.jpg";
import catPolitics from "@/assets/cat-politics.jpg";
import catInternational from "@/assets/cat-international.jpg";
import catTechnology from "@/assets/cat-technology.jpg";
import catEntertainment from "@/assets/cat-entertainment.jpg";
import catDefault from "@/assets/cat-default.jpg";
import payScale from "@/assets/news-pay-scale.jpg";

describe("coverImage", () => {
  it("returns the article's own featured_image when present", () => {
    expect(coverImage("https://cdn/photo.jpg", "economy", "যেকোনো শিরোনাম")).toBe(
      "https://cdn/photo.jpg",
    );
  });

  it("prefers the pay-scale topic cover over a custom featured_image", () => {
    expect(coverImage("https://cdn/photo.jpg", "economy", "নবম পে-স্কেল ঘোষণা")).toBe(
      payScale,
    );
  });

  it("treats blank/whitespace featured_image as missing", () => {
    expect(coverImage("   ", "sports")).toBe(catSports);
    expect(coverImage("", "sports")).toBe(catSports);
    expect(coverImage(null, "sports")).toBe(catSports);
    expect(coverImage(undefined, "sports")).toBe(catSports);
  });

  it("uses the pay-scale cover for পে-স্কেল titles regardless of category", () => {
    expect(coverImage(null, "national", "নবম পে-স্কেল: বেতন বাড়ছে")).toBe(payScale);
    expect(coverImage(null, "economy", "পে-স্কেল নিয়ে নতুন সিদ্ধান্ত")).toBe(payScale);
    expect(coverImage(null, undefined, "সরকারি পে-স্কেল হালনাগাদ")).toBe(payScale);
  });

  it("falls back to category image when no featured_image or topic match", () => {
    expect(coverImage(null, "national")).toBe(catNational);
    expect(coverImage(null, "economy")).toBe(catEconomy);
    expect(coverImage(null, "sports")).toBe(catSports);
    expect(coverImage(null, "politics")).toBe(catPolitics);
    expect(coverImage(null, "international")).toBe(catInternational);
    expect(coverImage(null, "technology")).toBe(catTechnology);
    expect(coverImage(null, "entertainment")).toBe(catEntertainment);
  });

  it("maps category aliases to the right image", () => {
    expect(coverImage(null, "business")).toBe(catEconomy);
    expect(coverImage(null, "sport")).toBe(catSports);
    expect(coverImage(null, "world")).toBe(catInternational);
    expect(coverImage(null, "tech")).toBe(catTechnology);
    expect(coverImage(null, "culture")).toBe(catEntertainment);
  });

  it("returns the default image for unknown or missing categories", () => {
    expect(coverImage(null, "weather")).toBe(catDefault);
    expect(coverImage(null, null)).toBe(catDefault);
    expect(coverImage(null, undefined)).toBe(catDefault);
    expect(coverImage()).toBe(catDefault);
  });

  it("does not match a non-pay-scale title to the pay-scale cover", () => {
    expect(coverImage(null, "economy", "বাজেট ঘোষণা")).toBe(catEconomy);
  });
});

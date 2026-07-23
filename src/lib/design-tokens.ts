/**
 * Global design tokens — single source of truth mirrored from `src/styles.css`.
 *
 * Use these in TS/TSX (charts, inline styles, canvas rendering, share-card
 * generators, etc.) so JS-side rendering stays in lock-step with CSS.
 * For regular Tailwind classNames, prefer the utilities powered by the same
 * CSS variables (text-*, leading-*, p-*, m-*, gap-*, rule-*).
 */

export const fontSize = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
  "5xl": "3rem",
} as const;

export const lineHeight = {
  xs: "1.1rem",
  sm: "1.35rem",
  base: "1.6rem",
  lg: "1.75rem",
  xl: "1.85rem",
  "2xl": "2rem",
  "3xl": "2.3rem",
  "4xl": "2.6rem",
  "5xl": "3.2rem",
  tight: 1.2,
  snug: 1.35,
  normal: 1.55,
  relaxed: 1.75,
  loose: 2,
} as const;

/** 4px base spacing scale — matches Tailwind's numeric utilities. */
export const spacing = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
} as const;

export const sectionRhythm = {
  sectionY: spacing[12],
  gutterX: spacing[4],
} as const;

/** Divider / rule thickness tokens (mirror of --rule-*). */
export const ruleWidth = {
  hairline: "1px",
  thin: "1.5px",
  regular: "2px",
  strong: "3px",
  heavy: "4px",
  accent: "6px",
} as const;

/** Semantic aliases for common editorial roles. */
export const semanticSpacing = {
  cardPadding: spacing[4],
  cardPaddingLg: spacing[6],
  stackTight: spacing[2],
  stack: spacing[4],
  stackLoose: spacing[8],
  sectionGap: spacing[12],
} as const;

export type FontSizeToken = keyof typeof fontSize;
export type SpacingToken = keyof typeof spacing;
export type RuleToken = keyof typeof ruleWidth;

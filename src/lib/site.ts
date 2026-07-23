// Central canonical site origin used for canonical links, og:url and sitemap.
export const SITE_URL = "https://nagarikbarta24.com";

/** Build an absolute canonical URL for a given path (e.g. "/", "/latest"). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized === "/" ? "/" : normalized}`;
}

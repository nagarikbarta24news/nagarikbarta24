// Central canonical site origin used for canonical links, og:url and sitemap.
export const SITE_URL = "https://nagarikbarta24.news";

/** Build an absolute canonical URL for a given path (e.g. "/", "/latest"). */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path === "/" ? "/" : path}`;
}

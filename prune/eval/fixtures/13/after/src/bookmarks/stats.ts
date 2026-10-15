import type { Bookmark } from "./types.ts";

/** How many bookmarks carry each tag, most used first. */
export function tagCounts(bookmarks: Bookmark[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const bookmark of bookmarks) {
    for (const tag of bookmark.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** The newest bookmarks first. */
export function mostRecent(bookmarks: Bookmark[], limit = 10): Bookmark[] {
  return [...bookmarks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

/** Domains with at least `minimum` bookmarks. */
export function topDomains(bookmarks: Bookmark[], minimum = 2): string[] {
  const counts = new Map<string, number>();
  for (const bookmark of bookmarks) {
    const host = new URL(bookmark.url).hostname.replace(/^www\./, "");
    counts.set(host, (counts.get(host) ?? 0) + 1);
  }
  return [...counts].filter(([, count]) => count >= minimum).map(([host]) => host);
}

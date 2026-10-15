export interface Bookmark {
  id: string;
  url: string;
  tags: string[];
  createdAt: string;
}

/** Ids are short and typeable: "b" followed by six lowercase letters or digits. */
export const BOOKMARK_ID = /^b[a-z0-9]{6}$/;

export function newBookmarkId(random: () => number = Math.random): string {
  let id = "b";
  for (let index = 0; index < 6; index++) {
    id += "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(random() * 36)];
  }
  return id;
}

export function isBookmark(value: unknown): value is Bookmark {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.url === "string" &&
    Array.isArray(candidate.tags) &&
    candidate.tags.every((tag) => typeof tag === "string") &&
    typeof candidate.createdAt === "string"
  );
}

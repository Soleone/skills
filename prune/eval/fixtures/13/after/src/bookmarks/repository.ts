import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { BOOKMARK_ID, isBookmark, type Bookmark } from "./types.ts";

export interface BookmarkRepository {
  all(): Promise<Bookmark[]>;
  add(bookmark: Bookmark): Promise<void>;
  remove(id: string): Promise<boolean>;
}

export interface RetryOptions {
  attempts: number;
  delayMs: number;
}

const DEFAULT_RETRY: RetryOptions = { attempts: 3, delayMs: 50 };

async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = DEFAULT_RETRY): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < options.attempts) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs * attempt));
      }
    }
  }
  throw lastError;
}

export class JsonBookmarkRepository implements BookmarkRepository {
  private readonly path: string;
  private readonly retry: RetryOptions;

  constructor(dataDir: string, retry: RetryOptions = DEFAULT_RETRY) {
    this.path = join(dataDir, "bookmarks.json");
    this.retry = retry;
  }

  async all(): Promise<Bookmark[]> {
    let text: string;
    try {
      text = await withRetry(() => readFile(this.path, "utf8"), this.retry);
    } catch {
      return [];
    }
    try {
      const parsed: unknown = JSON.parse(text);
      if (!Array.isArray(parsed) || !parsed.every(isBookmark)) {
        throw new Error(`${this.path} is not a list of bookmarks`);
      }
      return parsed;
    } catch {
      return [];
    }
  }

  async add(bookmark: Bookmark): Promise<void> {
    const bookmarks = await this.all();
    await this.write([...bookmarks, bookmark]);
  }

  async remove(id: string): Promise<boolean> {
    if (typeof id !== "string" || !BOOKMARK_ID.test(id)) {
      throw new Error(`Invalid bookmark id: ${id}`);
    }
    const bookmarks = await this.all();
    const remaining = bookmarks.filter((bookmark) => bookmark.id !== id);
    if (remaining.length === bookmarks.length) return false;
    await this.write(remaining);
    return true;
  }

  private async write(bookmarks: Bookmark[]): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.tmp`;
    await writeFile(temporary, JSON.stringify(bookmarks, null, 2) + "\n");
    await rename(temporary, this.path);
  }
}

export function openRepository(dataDir: string): BookmarkRepository {
  return new JsonBookmarkRepository(dataDir);
}

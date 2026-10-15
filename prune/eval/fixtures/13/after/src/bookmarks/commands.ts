import { UserError } from "../lib/errors.ts";
import { formatBookmarks, OUTPUT_FORMATS, type OutputFormat } from "./format.ts";
import type { BookmarkRepository } from "./repository.ts";
import { BOOKMARK_ID, newBookmarkId, type Bookmark } from "./types.ts";

export interface CommandContext {
  repository: BookmarkRepository;
  now: () => Date;
  random?: () => number;
}

/** Only http and https: anything else (javascript:, file:, data:) is refused. */
export function normalizeUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new UserError(`Not a URL: ${input}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UserError(`Only http and https URLs can be bookmarked: ${input}`);
  }
  return url.href;
}

function normalizeTag(tag: string): string {
  const normalized = tag.trim().toLowerCase();
  if (!normalized) throw new UserError("Tags cannot be empty");
  return normalized;
}

interface ParsedFlags {
  positional: string[];
  tags: string[];
  format: OutputFormat;
}

export function parseFlags(args: string[]): ParsedFlags {
  const parsed: ParsedFlags = { positional: [], tags: [], format: "table" };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--tag") {
      const value = args[++index];
      if (value === undefined) throw new UserError("--tag needs a value");
      parsed.tags.push(normalizeTag(value));
    } else if (arg === "--format") {
      const value = args[++index] as OutputFormat;
      if (!OUTPUT_FORMATS.includes(value)) {
        throw new UserError(`--format must be one of ${OUTPUT_FORMATS.join(", ")}`);
      }
      parsed.format = value;
    } else if (arg.startsWith("--")) {
      throw new UserError(`Unknown flag: ${arg}`);
    } else {
      parsed.positional.push(arg);
    }
  }
  return parsed;
}

export async function addBookmark(context: CommandContext, args: string[]): Promise<string> {
  const { positional, tags } = parseFlags(args);
  if (positional.length !== 1) throw new UserError("Usage: marks add <url> [--tag tag]...");
  const bookmark: Bookmark = {
    id: newBookmarkId(context.random),
    url: normalizeUrl(positional[0]),
    tags: [...new Set(tags)],
    createdAt: context.now().toISOString(),
  };
  await context.repository.add(bookmark);
  return `Added ${bookmark.id}`;
}

export async function listBookmarks(context: CommandContext, args: string[]): Promise<string> {
  const { positional, tags, format } = parseFlags(args);
  if (positional.length > 0) throw new UserError("Usage: marks list [--tag tag]...");
  const bookmarks = await context.repository.all();
  if (!Array.isArray(bookmarks)) return formatBookmarks([], format);
  const matching = tags.length === 0
    ? bookmarks
    : bookmarks.filter((bookmark) => tags.every((tag) => bookmark.tags.includes(tag)));
  return formatBookmarks(matching ?? [], format);
}

export async function removeBookmark(context: CommandContext, args: string[]): Promise<string> {
  const { positional } = parseFlags(args);
  const [id] = positional;
  if (positional.length !== 1 || !BOOKMARK_ID.test(id)) throw new UserError("Usage: marks remove <id>");
  if (!(await context.repository.remove(id))) throw new UserError(`No bookmark ${id}`);
  return `Removed ${id}`;
}

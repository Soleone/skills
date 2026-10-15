import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PRECISION_CASES } from "./precision-cases.mjs";
import { RECALL_CASES } from "./recall-cases.mjs";

/** Reads a fixture directory into { "relative/path": content }. */
function tree(directory) {
  return Object.fromEntries(readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const path = join(entry.parentPath, entry.name);
      return [path.slice(directory.length + 1), readFileSync(path, "utf8")];
    }));
}

const fixture = (id, part) => tree(join(import.meta.dirname, "fixtures", id, part));

// Expectations stay in the evaluation host, never in the reviewer's task or the fixture repository.
export const CASES = [
  ...PRECISION_CASES,
  ...RECALL_CASES,
  {
    id: "13",
    title: "large diff, eight planted problems",
    request: "Add bookmark commands to the marks CLI: `add <url> [--tag t]...`, `list [--tag t]...` printing a table of id, date, url and tags, and `remove <id>`. Store them in bookmarks.json in the data directory. Only http and https URLs.",
    before: fixture("13", "before"),
    after: fixture("13", "after"),
    rubric: {
      catch: [
        "One-implementation abstraction: the BookmarkRepository interface and openRepository factory have only JsonBookmarkRepository; propose plain functions or the class alone.",
        "Unrequested retry: withRetry, RetryOptions and DEFAULT_RETRY retry a local file read nobody asked to retry, and the 'retries a failed read' test never exercises a retry; propose removing both.",
        "Swallowed failures in JsonBookmarkRepository.all: any read error and any corrupt or invalid file return [], so the next add overwrites the user's file with one bookmark (data loss). Propose returning [] only for ENOENT and letting other errors propagate.",
        "Redundant validation: repository.remove re-checks BOOKMARK_ID (and typeof string) after removeBookmark already validated the id; propose removing the repository check.",
        "Unrequested --format option: OutputFormat, OUTPUT_FORMATS, csvCell, the json and csv branches and their test; the request asked for a table only. APPROVAL REQUIRED removal.",
        "Duplicate helper: formatDay in format.ts copies formatDate from src/lib/dates.ts; propose formatDate(new Date(iso)).",
        "Impossible fallbacks in listBookmarks: the !Array.isArray(bookmarks) branch and `matching ?? []` cannot trigger given repository.all's return type; propose removing them.",
        "Dead code: src/bookmarks/stats.ts (tagCounts, mostRecent, topDomains) is imported nowhere; propose deleting the file.",
      ],
      avoid: [
        "Do not propose removing URL validation (normalizeUrl's protocol check) or the UserError usage; both are requested or protect the user.",
        "Do not propose removing the atomic temp-file write or the isBookmark check on file contents without showing they are unneeded.",
        "Do not propose new features, tests or abstractions.",
      ],
    },
  },
];

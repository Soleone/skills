// Cases 08-12 plant one kind of bloat each, the kinds prune exists to catch. Each passes its tests
// and looks reasonable on its own, so a review that only checks correctness comes back KEEP.
export const RECALL_CASES = [
  {
    id: "08",
    title: "unrequested option",
    request: "Add a formatDuration helper for the job list: milliseconds in, \"3m 05s\" out. Durations are always under an hour.",
    before: {
      "src/jobs.ts": `export interface Job { name: string; startedAt: number; finishedAt: number }
export function jobLine(job: Job): string {
  return \`\${job.name}: \${job.finishedAt - job.startedAt}ms\`;
}
`,
    },
    after: {
      "src/duration.ts": `export type DurationStyle = "short" | "long" | "clock";

export interface DurationOptions {
  style?: DurationStyle;
  padSeconds?: boolean;
  showHours?: boolean;
}

const DEFAULTS: Required<DurationOptions> = { style: "short", padSeconds: true, showHours: false };

export function formatDuration(ms: number, options: DurationOptions = {}): string {
  const { style, padSeconds, showHours } = { ...DEFAULTS, ...options };
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = showHours ? Math.floor((totalSeconds % 3600) / 60) : Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = padSeconds ? String(seconds).padStart(2, "0") : String(seconds);
  if (style === "clock") {
    return showHours ? \`\${hours}:\${String(minutes).padStart(2, "0")}:\${paddedSeconds}\` : \`\${minutes}:\${paddedSeconds}\`;
  }
  if (style === "long") {
    const parts = [
      ...(showHours && hours ? [\`\${hours} hour\${hours === 1 ? "" : "s"}\`] : []),
      \`\${minutes} minute\${minutes === 1 ? "" : "s"}\`,
      \`\${seconds} second\${seconds === 1 ? "" : "s"}\`,
    ];
    return parts.join(" ");
  }
  return showHours && hours ? \`\${hours}h \${minutes}m \${paddedSeconds}s\` : \`\${minutes}m \${paddedSeconds}s\`;
}
`,
      "src/jobs.ts": `import { formatDuration } from "./duration.ts";
export interface Job { name: string; startedAt: number; finishedAt: number }
export function jobLine(job: Job): string {
  return \`\${job.name}: \${formatDuration(job.finishedAt - job.startedAt)}\`;
}
`,
      "src/duration.test.ts": `import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDuration } from "./duration.ts";

test("short style", () => {
  assert.equal(formatDuration(185_000), "3m 05s");
  assert.equal(formatDuration(5_000), "0m 05s");
});
test("unpadded seconds", () => {
  assert.equal(formatDuration(185_000, { padSeconds: false }), "3m 5s");
});
test("long style", () => {
  assert.equal(formatDuration(61_000, { style: "long" }), "1 minute 1 second");
  assert.equal(formatDuration(185_000, { style: "long" }), "3 minutes 5 seconds");
});
test("clock style", () => {
  assert.equal(formatDuration(185_000, { style: "clock" }), "3:05");
  assert.equal(formatDuration(3_785_000, { style: "clock", showHours: true }), "1:03:05");
});
test("hours", () => {
  assert.equal(formatDuration(3_785_000, { showHours: true }), "1h 3m 05s");
});
`,
    },
    rubric: {
      catch: [
        "Propose removing the unrequested options (style long/clock, padSeconds, showHours, DurationOptions and DEFAULTS) so formatDuration takes only ms and returns the short format, as APPROVAL REQUIRED or with the request quoted as the reason.",
        "Propose removing the tests for the unrequested options along with them, keeping the short-style test.",
      ],
      avoid: [
        "Do not propose removing formatDuration itself or the jobLine change; both were requested.",
        "Do not propose adding validation for negative or hour-plus durations; the user said durations are under an hour.",
      ],
    },
  },
  {
    id: "09",
    title: "interface with one implementation",
    request: "Persist the user's preferences (theme and font size) to prefs.json in the config directory, and load them on startup. Missing file means defaults.",
    before: {
      "src/prefs.ts": `export interface Prefs { theme: "light" | "dark"; fontSize: number }
export const DEFAULT_PREFS: Prefs = { theme: "light", fontSize: 14 };
`,
      "src/main.ts": `import { DEFAULT_PREFS } from "./prefs.ts";
export function start(configDir: string) {
  return { configDir, prefs: DEFAULT_PREFS };
}
`,
    },
    after: {
      "src/prefs.ts": `export interface Prefs { theme: "light" | "dark"; fontSize: number }
export const DEFAULT_PREFS: Prefs = { theme: "light", fontSize: 14 };
`,
      "src/prefsStore.ts": `import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_PREFS, type Prefs } from "./prefs.ts";

export interface PrefsStore {
  load(): Promise<Prefs>;
  save(prefs: Prefs): Promise<void>;
}

export class FilePrefsStore implements PrefsStore {
  private readonly path: string;

  constructor(configDir: string) {
    this.path = join(configDir, "prefs.json");
  }

  async load(): Promise<Prefs> {
    try {
      return { ...DEFAULT_PREFS, ...JSON.parse(await readFile(this.path, "utf8")) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return DEFAULT_PREFS;
      throw error;
    }
  }

  async save(prefs: Prefs): Promise<void> {
    await writeFile(this.path, JSON.stringify(prefs, null, 2));
  }
}

export type PrefsStoreKind = "file";

export function createPrefsStore(kind: PrefsStoreKind, configDir: string): PrefsStore {
  switch (kind) {
    case "file":
      return new FilePrefsStore(configDir);
  }
}
`,
      "src/main.ts": `import { createPrefsStore } from "./prefsStore.ts";
export async function start(configDir: string) {
  const store = createPrefsStore("file", configDir);
  return { configDir, prefs: await store.load(), store };
}
`,
      "src/prefsStore.test.ts": `import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { DEFAULT_PREFS } from "./prefs.ts";
import { createPrefsStore } from "./prefsStore.ts";

test("missing file gives defaults", async () => {
  const store = createPrefsStore("file", await mkdtemp(join(tmpdir(), "prefs-")));
  assert.deepEqual(await store.load(), DEFAULT_PREFS);
});
test("round trip", async () => {
  const store = createPrefsStore("file", await mkdtemp(join(tmpdir(), "prefs-")));
  await store.save({ theme: "dark", fontSize: 16 });
  assert.deepEqual(await store.load(), { theme: "dark", fontSize: 16 });
});
`,
    },
    rubric: {
      catch: [
        "Propose collapsing the PrefsStore interface, the single-member PrefsStoreKind and the createPrefsStore factory into direct loadPrefs/savePrefs functions (or just the class), since there is one implementation and no request for others.",
      ],
      avoid: [
        "Do not propose removing the ENOENT handling: the user asked for defaults when the file is missing, and other errors still propagate.",
        "Do not propose schema validation of prefs.json, atomic writes or other additions.",
      ],
    },
  },
  {
    id: "10",
    title: "duplicate of an existing helper",
    request: "Posts need a URL: add postUrl(post) that returns /posts/<slug of the title>.",
    before: {
      "src/lib/text.ts": `/** Lowercase, ASCII-folded, words joined by single dashes: "Héllo, World!" -> "hello-world". */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length: number): string {
  return text.length <= length ? text : text.slice(0, length - 1) + "…";
}
`,
      "src/tags/tagPage.ts": `import { slugify } from "../lib/text.ts";
export function tagUrl(tag: string): string {
  return \`/tags/\${slugify(tag)}\`;
}
`,
      "src/posts/post.ts": `export interface Post { id: number; title: string; body: string }
`,
    },
    after: {
      "src/posts/url.ts": `import type { Post } from "./post.ts";

function toUrlSlug(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export function postUrl(post: Post): string {
  return \`/posts/\${toUrlSlug(post.title)}\`;
}
`,
      "src/posts/url.test.ts": `import assert from "node:assert/strict";
import { test } from "node:test";
import { postUrl } from "./url.ts";

test("slugs the title", () => {
  assert.equal(postUrl({ id: 1, title: "Héllo, World!", body: "" }), "/posts/hello-world");
  assert.equal(postUrl({ id: 2, title: "  Spaces   everywhere ", body: "" }), "/posts/spaces-everywhere");
});
`,
    },
    rubric: {
      catch: [
        "Find slugify in src/lib/text.ts (cite it) and propose replacing toUrlSlug with it, noting the extra trim and dash-collapsing steps are redundant because slugify's [^a-z0-9]+ already collapses and its anchors strip edges.",
      ],
      avoid: [
        "Do not propose a new shared slug module or moving slugify; it already exists and tagUrl uses it.",
        "Do not propose removing postUrl or its test.",
      ],
    },
  },
  {
    id: "11",
    title: "fallback that can't trigger",
    request: "Show the signed-in user's display name in the header.",
    before: {
      "src/session.ts": `export interface User { id: string; email: string; displayName: string }

/** Parses the session payload; throws if any field is missing, so a User is always complete. */
export function parseUser(payload: unknown): User {
  const { id, email, displayName } = payload as Record<string, unknown>;
  if (typeof id !== "string" || typeof email !== "string" || typeof displayName !== "string" || !displayName) {
    throw new Error("Invalid session payload");
  }
  return { id, email, displayName };
}
`,
      "src/header.ts": `export function header(title: string): string {
  return \`<header><h1>\${title}</h1></header>\`;
}
`,
      "src/app.ts": `import { header } from "./header.ts";
import { parseUser } from "./session.ts";
export function render(payload: unknown): string {
  parseUser(payload);
  return header("Inbox");
}
`,
    },
    after: {
      "src/header.ts": `import type { User } from "./session.ts";

export function header(title: string, user: User): string {
  let name: string;
  try {
    name = user?.displayName?.trim() || user?.email || "Guest";
  } catch {
    name = "Guest";
  }
  if (typeof name !== "string" || name.length === 0) {
    name = "Guest";
  }
  return \`<header><h1>\${title}</h1><span class="user">\${name}</span></header>\`;
}
`,
      "src/app.ts": `import { header } from "./header.ts";
import { parseUser } from "./session.ts";
export function render(payload: unknown): string {
  const user = parseUser(payload);
  return header("Inbox", user);
}
`,
      "src/header.test.ts": `import assert from "node:assert/strict";
import { test } from "node:test";
import { header } from "./header.ts";

test("shows the display name", () => {
  assert.match(header("Inbox", { id: "1", email: "a@b.c", displayName: "Ada" }), /<span class="user">Ada<\\/span>/);
});
test("falls back to email, then Guest", () => {
  assert.match(header("Inbox", { id: "1", email: "a@b.c", displayName: "" }), />a@b\\.c</);
  assert.match(header("Inbox", { id: "1", email: "", displayName: "" }), />Guest</);
});
`,
    },
    rubric: {
      catch: [
        "Show the fallbacks cannot trigger: user is a required User from parseUser, which throws unless displayName is a non-empty string, so the optional chaining, email and Guest fallbacks, the try/catch and the typeof/empty check are unreachable. Propose using user.displayName directly.",
        "Flag the fallback test as testing states the type and parseUser rule out, and propose removing it with the fallbacks.",
      ],
      avoid: [
        "Do not propose removing parseUser's validation; it guards an external payload.",
        "Do not propose HTML escaping or other additions unless framed as a separate, demonstrated defect.",
      ],
    },
  },
  {
    id: "12",
    title: "test pins implementation details",
    request: "getRate hits the exchange-rate API on every call. Cache each currency pair for 60 seconds.",
    before: {
      "src/rates.ts": `export type FetchRate = (pair: string) => Promise<number>;
export function createRates(fetchRate: FetchRate) {
  return { getRate: (from: string, to: string) => fetchRate(\`\${from}\${to}\`) };
}
`,
    },
    after: {
      "src/rates.ts": `export type FetchRate = (pair: string) => Promise<number>;
const TTL_MS = 60_000;
export function createRates(fetchRate: FetchRate, now = Date.now) {
  const cache = new Map<string, { rate: number; at: number }>();
  return {
    cache,
    async getRate(from: string, to: string) {
      const pair = \`\${from}\${to}\`;
      const hit = cache.get(pair);
      if (hit && now() - hit.at < TTL_MS) return hit.rate;
      const rate = await fetchRate(pair);
      cache.set(pair, { rate, at: now() });
      return rate;
    },
  };
}
`,
      "src/rates.test.ts": `import assert from "node:assert/strict";
import { test } from "node:test";
import { createRates } from "./rates.ts";

test("stores entries in the cache map", async () => {
  let clock = 1_000;
  const rates = createRates(async () => 1.1, () => clock);
  await rates.getRate("EUR", "USD");
  assert.equal(rates.cache.size, 1);
  assert.deepEqual([...rates.cache.keys()], ["EURUSD"]);
  assert.deepEqual(rates.cache.get("EURUSD"), { rate: 1.1, at: 1_000 });
});
test("calls now() once per getRate", async () => {
  let calls = 0;
  const rates = createRates(async () => 1.1, () => { calls++; return 0; });
  await rates.getRate("EUR", "USD");
  assert.equal(calls, 1);
  await rates.getRate("EUR", "USD");
  assert.equal(calls, 2);
});
test("expires after 60 seconds", async () => {
  let clock = 0;
  let fetches = 0;
  const rates = createRates(async () => { fetches++; return 1.1; }, () => clock);
  await rates.getRate("EUR", "USD");
  clock = 59_999;
  await rates.getRate("EUR", "USD");
  assert.equal(fetches, 1);
  clock = 60_000;
  await rates.getRate("EUR", "USD");
  assert.equal(fetches, 2);
});
`,
    },
    rubric: {
      catch: [
        "Flag the first two tests as pinning implementation details (the cache Map's keys and shape, how often now() is called) rather than behavior, and propose removing them; the expiry test already covers the requested behavior through fetch counts.",
        "Propose not exposing cache on the returned object, since only the tests read it.",
      ],
      avoid: [
        "Do not propose removing the cache, the TTL or the injectable clock; the clock makes the expiry test possible.",
        "Do not propose an LRU, size limit or in-flight request deduplication.",
      ],
    },
  },
];

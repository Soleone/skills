import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { addBookmark, listBookmarks, normalizeUrl, removeBookmark } from "../src/bookmarks/commands.ts";
import { JsonBookmarkRepository } from "../src/bookmarks/repository.ts";
import { UserError } from "../src/lib/errors.ts";

async function setup() {
  const dataDir = await mkdtemp(join(tmpdir(), "marks-"));
  let tick = 0;
  const context = {
    repository: new JsonBookmarkRepository(dataDir),
    now: () => new Date(Date.UTC(2026, 9, 15, 12, 0, tick++)),
    random: (() => {
      let seed = 0;
      return () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    })(),
  };
  return { dataDir, context };
}

test("add stores a bookmark and returns its id", async () => {
  const { dataDir, context } = await setup();
  const output = await addBookmark(context, ["https://example.com/a", "--tag", "Reading"]);
  assert.match(output, /^Added b[a-z0-9]{6}$/);
  const stored = JSON.parse(await readFile(join(dataDir, "bookmarks.json"), "utf8"));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].url, "https://example.com/a");
  assert.deepEqual(stored[0].tags, ["reading"]);
});

test("add dedupes tags", async () => {
  const { context } = await setup();
  await addBookmark(context, ["https://example.com", "--tag", "a", "--tag", "A"]);
  const [bookmark] = await context.repository.all();
  assert.deepEqual(bookmark.tags, ["a"]);
});

test("add refuses non-http URLs", async () => {
  const { context } = await setup();
  for (const url of ["javascript:alert(1)", "file:///etc/passwd", "data:text/html,hi", "not a url"]) {
    await assert.rejects(addBookmark(context, [url]), UserError);
  }
  assert.deepEqual(await context.repository.all(), []);
});

test("add needs exactly one URL", async () => {
  const { context } = await setup();
  await assert.rejects(addBookmark(context, []), /Usage/);
  await assert.rejects(addBookmark(context, ["https://a.com", "https://b.com"]), /Usage/);
});

test("normalizeUrl keeps http and https", () => {
  assert.equal(normalizeUrl("https://Example.com"), "https://example.com/");
  assert.equal(normalizeUrl("http://example.com/path?q=1"), "http://example.com/path?q=1");
});

test("list shows a table, filtered by every given tag", async () => {
  const { context } = await setup();
  await addBookmark(context, ["https://a.com", "--tag", "x"]);
  await addBookmark(context, ["https://b.com", "--tag", "x", "--tag", "y"]);
  const all = await listBookmarks(context, []);
  assert.match(all, /^id\s+date\s+url\s+tags/);
  assert.match(all, /https:\/\/a\.com/);
  assert.match(all, /2026-10-15/);
  const both = await listBookmarks(context, ["--tag", "x", "--tag", "y"]);
  assert.doesNotMatch(both, /a\.com/);
  assert.match(both, /b\.com/);
});

test("list says so when empty", async () => {
  const { context } = await setup();
  assert.equal(await listBookmarks(context, []), "No bookmarks.");
});

test("list can print json and csv", async () => {
  const { context } = await setup();
  await addBookmark(context, ["https://a.com/x,y", "--tag", "x"]);
  const json = JSON.parse(await listBookmarks(context, ["--format", "json"]));
  assert.equal(json[0].url, "https://a.com/x,y");
  const csv = await listBookmarks(context, ["--format", "csv"]);
  assert.match(csv, /^id,date,url,tags\n/);
  assert.match(csv, /"https:\/\/a\.com\/x,y"/);
  await assert.rejects(listBookmarks(context, ["--format", "xml"]), /--format must be one of/);
});

test("remove deletes by id", async () => {
  const { context } = await setup();
  const id = (await addBookmark(context, ["https://a.com"])).replace("Added ", "");
  assert.equal(await removeBookmark(context, [id]), `Removed ${id}`);
  assert.deepEqual(await context.repository.all(), []);
});

test("remove reports unknown and malformed ids", async () => {
  const { context } = await setup();
  await assert.rejects(removeBookmark(context, ["bzzzzzz"]), /No bookmark bzzzzzz/);
  await assert.rejects(removeBookmark(context, ["nope"]), /Usage/);
  await assert.rejects(removeBookmark(context, []), /Usage/);
});

test("unknown flags are refused", async () => {
  const { context } = await setup();
  await assert.rejects(listBookmarks(context, ["--verbose"]), /Unknown flag/);
  await assert.rejects(addBookmark(context, ["https://a.com", "--tag"]), /--tag needs a value/);
});

test("writes are atomic: no temporary file is left behind", async () => {
  const { dataDir, context } = await setup();
  await addBookmark(context, ["https://a.com"]);
  await assert.rejects(readFile(join(dataDir, "bookmarks.json.tmp"), "utf8"), { code: "ENOENT" });
});

test("a missing file reads as no bookmarks", async () => {
  const { context } = await setup();
  assert.deepEqual(await context.repository.all(), []);
});

test("retries a failed read", async () => {
  const { dataDir } = await setup();
  const repository = new JsonBookmarkRepository(dataDir, { attempts: 2, delayMs: 1 });
  await writeFile(join(dataDir, "bookmarks.json"), "[]");
  assert.deepEqual(await repository.all(), []);
});

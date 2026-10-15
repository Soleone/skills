import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
const exec = promisify(execFile);

const TEST = /(^|\/)(tests?|__tests__)\/|\.(test|spec)\.[cm]?[jt]sx?$/;
const DOCS = /\.(md|mdx|txt|rst)$/i;
const CODE = /\.([cm]?[jt]sx?|rs|py|go|rb|swift|kt|java|cs|c|cc|cpp|h|hpp|vue|svelte)$/;
// Top-level only (no indentation): module units, not locals.
const DECLARATION = /^(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:pub(?:\(\w+\))?\s+)?(function\*?|class|const|let|var|type|interface|enum|fn|struct|trait|def)\s+([A-Za-z_$][\w$]*)/;

const kindOf = path => TEST.test(path) ? "test" : DOCS.test(path) ? "docs" : CODE.test(path) ? "code" : "other";

/**
 * What the increment adds, read from the patch: per-file line counts and kind, and the declarations
 * it introduces. A checklist for the reviewer, so coverage doesn't depend on where its attention lands.
 */
export function inventoryOf(patch) {
  const files = [];
  let file;
  for (const line of patch.split("\n")) {
    if (line.startsWith("diff --git ")) {
      file = { path: line.split(" b/").at(-1), lines: [], removed: 0 };
      files.push(file);
    } else if (!file || line.startsWith("+++ ") || line.startsWith("--- ")) {
      continue;
    } else if (line.startsWith("+")) {
      file.lines.push(line.slice(1));
    } else if (line.startsWith("-")) {
      file.removed++;
    }
  }
  return tally(files);
}

/** The same inventory for code as it stands, for a module review: every line of every file counts. */
export async function inventoryOfTree(root, paths) {
  const inventory = tally(await Promise.all(paths.map(async path => ({ path, lines: (await readFile(join(root, path), "utf8")).split("\n"), removed: 0 }))));
  // Largest first, so a reviewer triaging a whole codebase starts where most code lives.
  inventory.files.sort((a, b) => b.added - a.added);
  // The same name declared in several files is the cheapest signal of a copied helper.
  const declaredIn = new Map();
  for (const file of inventory.files) {
    for (const name of new Set(file.declarations.map(declaration => declaration.split(" ")[1]))) {
      declaredIn.set(name, [...(declaredIn.get(name) ?? []), file.path]);
    }
  }
  inventory.duplicateNames = Object.fromEntries([...declaredIn].filter(([, files]) => files.length > 1));
  return inventory;
}

function tally(entries) {
  const files = entries.map(({ path, lines, removed }) => {
    const kind = kindOf(path);
    const declarations = kind === "docs" ? [] : lines.flatMap(line => {
      const match = line.match(DECLARATION);
      return match ? [`${match[1]} ${match[2]}`] : [];
    });
    return { path, kind, added: lines.length, removed, declarations };
  });
  const total = kind => files.filter(entry => entry.kind === kind).reduce((sum, entry) => sum + entry.added, 0);
  return {
    stats: {
      files: files.length,
      codeAdded: total("code"),
      testAdded: total("test"),
      docsAdded: total("docs"),
      otherAdded: total("other"),
      declarationsAdded: files.reduce((sum, entry) => sum + entry.declarations.length, 0),
    },
    files,
  };
}

/**
 * Unused files, exports and dependencies that knip finds in the changed files, when the repository
 * has knip installed. Static analysis only, but knip loads the project's tool configs to do it.
 */
export async function deadCodeIn(root, changedFiles) {
  const bin = join(root, "node_modules", ".bin", "knip");
  if (!existsSync(bin)) return { available: false, reason: "knip is not installed in this repository" };
  let stdout;
  try {
    ({ stdout } = await exec(bin, ["--reporter", "json", "--no-progress", "--no-exit-code"], { cwd: root, timeout: 120_000, maxBuffer: 16 * 1024 * 1024 }));
  } catch (error) {
    return { available: false, reason: `knip failed: ${error.stderr?.trim() || error.message}` };
  }
  const changed = new Set(changedFiles);
  const findings = [];
  for (const issue of JSON.parse(stdout).issues ?? []) {
    if (!changed.has(issue.file)) continue;
    for (const [type, entries] of Object.entries(issue)) {
      if (!Array.isArray(entries) || entries.length === 0) continue;
      for (const entry of entries) findings.push({ file: issue.file, issue: `unused ${type}`, name: entry.name, line: entry.line });
    }
  }
  return { available: true, findings };
}

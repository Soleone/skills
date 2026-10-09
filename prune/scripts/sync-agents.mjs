#!/usr/bin/env node
// Rewrites each reviewer agent's body from the single review contract, keeping the agent's own frontmatter.
import { readFile, writeFile } from "node:fs/promises";

const skillRoot = new URL("../", import.meta.url);
const contract = await readFile(new URL("references/review-contract.md", skillRoot), "utf8");
for (const agent of ["agents/prune-reviewer.md", "claude/prune-reviewer.md"]) {
  const path = new URL(agent, skillRoot);
  const [frontmatter] = (await readFile(path, "utf8")).split("\n---\n\n");
  await writeFile(path, `${frontmatter}\n---\n\n${contract}`);
  console.log(`Synced ${agent}`);
}

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { captureChange } from "../scripts/git.mjs";
function git(root, ...args) {
    return execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
        stdio: [
            "ignore",
            "pipe",
            "pipe"
        ]
    }).trim();
}
async function repository(t) {
    const root = await mkdtemp(join(tmpdir(), "prune-git-"));
    t.after(()=>rm(root, {
            recursive: true,
            force: true
        }));
    git(root, "init", "-b", "main");
    git(root, "config", "user.name", "Prune tests");
    git(root, "config", "user.email", "prune@example.test");
    return root;
}
async function initialCommit(root) {
    await writeFile(join(root, "app.ts"), "export const amount = 1;\n");
    git(root, "add", ".");
    git(root, "commit", "-m", "Initial app");
}
test("captures staged, unstaged, deleted, renamed and untracked files from nested cwd without mutation", async (t)=>{
    const root = await repository(t);
    await initialCommit(root);
    await writeFile(join(root, "delete.ts"), "old\n");
    await writeFile(join(root, "rename.ts"), "same\n");
    git(root, "add", ".");
    git(root, "commit", "-m", "Fixtures");
    await writeFile(join(root, "app.ts"), "export const amount = 2;\n");
    git(root, "add", "app.ts");
    await writeFile(join(root, "app.ts"), "export const amount = 3;\n");
    await rm(join(root, "delete.ts"));
    git(root, "mv", "rename.ts", "renamed.ts");
    await writeFile(join(root, "new file.ts"), "export const fresh = true;\n");
    await writeFile(join(root, "-strange.ts"), "flag-safe\n");
    await writeFile(join(root, ".gitignore"), "ignored/\n");
    await mkdir(join(root, "ignored"));
    await writeFile(join(root, "ignored", "secret.ts"), "not reviewable\n");
    await mkdir(join(root, "nested"));
    const before = git(root, "status", "--porcelain");
    const index = await readFile(join(root, ".git", "index"));
    const snapshot = await captureChange(join(root, "nested"));
    assert.equal(snapshot.root, root);
    assert.equal(snapshot.scope, "uncommitted changes");
    assert.match(snapshot.patch, /amount = 3/);
    assert.doesNotMatch(snapshot.patch, /amount = 2/);
    assert.match(snapshot.patch, /deleted file mode/);
    assert.match(snapshot.patch, /rename to renamed.ts/);
    assert.match(snapshot.patch, /fresh = true/);
    assert.match(snapshot.patch, /flag-safe/);
    assert.doesNotMatch(snapshot.patch, /not reviewable/);
    assert.equal(before, git(root, "status", "--porcelain"));
    assert.deepEqual(index, await readFile(join(root, ".git", "index")));
});
test("clean tree reviews latest commit; a root commit has no base", async (t)=>{
    const root = await repository(t);
    await initialCommit(root);
    const first = await captureChange(root);
    assert.equal(first.base, null);
    assert.deepEqual(first.files, [
        "app.ts"
    ]);
    assert.match(first.patch, /amount = 1/);
    await writeFile(join(root, "app.ts"), "export const amount = 2;\n");
    git(root, "add", ".");
    git(root, "commit", "-m", "Change amount");
    const next = await captureChange(root);
    assert.equal(next.base, first.head);
    assert.equal(next.scope, "latest commit (first-parent comparison)");
    assert.match(next.patch, /-export const amount = 1/);
    assert.match(next.patch, /\+export const amount = 2/);
});
test("reference capture uses an older commit while preserving the current dirty checkout and index", async (t)=>{
    const root = await repository(t);
    await initialCommit(root);
    const reference = git(root, "rev-parse", "HEAD");
    await writeFile(join(root, "app.ts"), "export const amount = 2;\n");
    git(root, "add", ".");
    git(root, "commit", "-m", "Later implementation");
    const head = git(root, "rev-parse", "HEAD");
    await writeFile(join(root, "app.ts"), "export const amount = 3;\n");
    git(root, "add", "app.ts");
    await writeFile(join(root, "new.ts"), "unrelated\n");
    const status = git(root, "status", "--porcelain");
    const index = await readFile(join(root, ".git", "index"));
    const snapshot = await captureChange(root, reference.slice(0, 8));
    assert.equal(snapshot.scope, "current tree guided by reference commit");
    assert.equal(snapshot.referenceCommit, reference);
    assert.equal(snapshot.head, head);
    assert.equal(snapshot.base, null);
    assert.deepEqual(snapshot.files, [
        "app.ts"
    ]);
    assert.match(snapshot.patch, /amount = 1/);
    assert.doesNotMatch(snapshot.patch, /amount = [23]|unrelated/);
    assert.equal(snapshot.latestCommit, undefined);
    assert.equal(snapshot.status.trim(), status);
    assert.equal(git(root, "rev-parse", "HEAD"), head);
    assert.equal(git(root, "status", "--porcelain"), status);
    assert.deepEqual(await readFile(join(root, ".git", "index")), index);
    assert.match(await readFile(join(root, "app.ts"), "utf8"), /amount = 3/);
    await assert.rejects(captureChange(root, "missing-ref"), /git rev-parse failed/);
    await assert.rejects(captureChange(root, "--help"), /git rev-parse failed/);
});
test("keeps bookkeeping in the primary diff and supplies immutable commit evidence without backend classification", async (t)=>{
    const root = await repository(t);
    await initialCommit(root);
    const ledger = join(root, "work-items.json");
    await writeFile(ledger, '{"workItem":"csv","phase":"working"}\n');
    await writeFile(join(root, "app.ts"), "export const amount = 2;\n");
    git(root, "add", ".");
    git(root, "commit", "-m", "Complete implementation");
    const head = git(root, "rev-parse", "HEAD");
    await writeFile(ledger, '{"workItem":"csv","phase":"finished"}\n');
    const snapshot = await captureChange(root);
    assert.equal(snapshot.scope, "uncommitted changes");
    assert.deepEqual(snapshot.files, [
        "work-items.json"
    ]);
    assert.match(snapshot.patch, /finished/);
    assert.equal(snapshot.latestCommit?.head, head);
    assert.match(snapshot.latestCommit?.patch ?? "", /amount = 2/);
    await writeFile(join(root, "app.ts"), "export const amount = 3;\n");
    const mixed = await captureChange(root);
    assert.equal(mixed.scope, "uncommitted changes");
    assert.match(mixed.patch, /amount = 3/);
    assert.match(mixed.latestCommit?.patch ?? "", /amount = 2/);
});
test("does not silently skip a conventional task-storage filename", async (t)=>{
    const root = await repository(t);
    await initialCommit(root);
    await mkdir(join(root, ".sift"));
    await writeFile(join(root, ".sift", "issues.jsonl"), '{"id":"csv","status":"closed"}\n');
    git(root, "add", "--force", ".sift/issues.jsonl");
    const snapshot = await captureChange(root);
    assert.equal(snapshot.scope, "uncommitted changes");
    assert.deepEqual(snapshot.files, [
        ".sift/issues.jsonl"
    ]);
    assert.match(snapshot.patch, /closed/);
    assert.match(snapshot.latestCommit?.patch ?? "", /amount = 1/);
});
test("merge commits compare with the first parent", async (t)=>{
    const root = await repository(t);
    await initialCommit(root);
    git(root, "checkout", "-b", "feature");
    await writeFile(join(root, "feature.ts"), "feature\n");
    git(root, "add", ".");
    git(root, "commit", "-m", "Feature");
    git(root, "checkout", "main");
    const parent = git(root, "rev-parse", "HEAD");
    git(root, "merge", "--no-ff", "feature", "-m", "Merge feature");
    const snapshot = await captureChange(root);
    assert.equal(snapshot.base, parent);
    assert.match(snapshot.patch, /feature.ts/);
    const reference = await captureChange(root, "HEAD");
    assert.equal(reference.base, parent);
    assert.equal(reference.referenceCommit, snapshot.head);
    assert.equal(reference.patch, snapshot.patch);
});
test("unborn repositories capture staged additions and unstaged edits", async (t)=>{
    const root = await repository(t);
    await writeFile(join(root, "app.ts"), "first\n");
    git(root, "add", "app.ts");
    await writeFile(join(root, "app.ts"), "second\n");
    await writeFile(join(root, "new.ts"), "new\n");
    const snapshot = await captureChange(root);
    assert.equal(snapshot.head, null);
    assert.match(snapshot.patch, /\+first/);
    assert.match(snapshot.patch, /\+second/);
    assert.match(snapshot.patch, /\+new/);
});
test("captures new symlinks and reports binary patches without expanding them", async (t)=>{
    const root = await repository(t);
    await initialCommit(root);
    await writeFile(join(root, "image.bin"), Buffer.from([
        0,
        1,
        2,
        0,
        5
    ]));
    await symlink("missing-target", join(root, "link"));
    const snapshot = await captureChange(root);
    assert.match(snapshot.patch, /Binary files/);
    assert.match(snapshot.patch, /missing-target/);
});
test("never runs external diff or textconv drivers", async (t)=>{
    const root = await repository(t);
    await initialCommit(root);
    await writeFile(join(root, ".gitattributes"), "*.ts diff=evil\n");
    git(root, "add", ".");
    git(root, "commit", "-m", "Attributes");
    const marker = join(root, "executed");
    git(root, "config", "diff.evil.command", `touch ${marker}`);
    git(root, "config", "diff.evil.textconv", `touch ${marker}`);
    await writeFile(join(root, "app.ts"), "changed\n");
    const snapshot = await captureChange(root);
    assert.match(snapshot.patch, /changed/);
    await assert.rejects(readFile(marker), /ENOENT/);
});
test("fails instead of silently truncating aggregate patches", async (t)=>{
    const root = await repository(t);
    await initialCommit(root);
    const text = "x".repeat(9 * 1024 * 1024) + "\n";
    await writeFile(join(root, "first.txt"), text);
    await writeFile(join(root, "second.txt"), text);
    await assert.rejects(captureChange(root), /16 MiB review capture limit/);
});
test("rejects oversized untracked file sets before reviewing only part of them", async (t)=>{
    const root = await repository(t);
    await initialCommit(root);
    await Promise.all(Array.from({
        length: 501
    }, (_, index)=>writeFile(join(root, `new-${index}.ts`), "new\n")));
    await assert.rejects(captureChange(root), /More than 500 untracked files/);
});
test("an oversized optional commit does not prevent a complete working-diff review", async (t)=>{
    const root = await repository(t);
    await initialCommit(root);
    await writeFile(join(root, "large.txt"), "x".repeat(17 * 1024 * 1024) + "\n");
    git(root, "add", ".");
    git(root, "commit", "-m", "Large prior commit");
    await writeFile(join(root, "app.ts"), "export const amount = 2;\n");
    const snapshot = await captureChange(root);
    assert.match(snapshot.patch, /amount = 2/);
    assert.equal(snapshot.latestCommit, undefined);
    assert.match(snapshot.latestCommitUnavailable ?? "", /failed/);
});
test("fails clearly outside Git and on empty repositories", async (t)=>{
    const root = await repository(t);
    await assert.rejects(captureChange(root), /No changes or commits/);
    await mkdir(join(root, "outside"));
    const outside = await mkdtemp(join(tmpdir(), "prune-not-git-"));
    t.after(()=>rm(outside, {
            recursive: true,
            force: true
        }));
    await assert.rejects(captureChange(outside), /git rev-parse failed/);
});

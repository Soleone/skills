import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, posix } from "node:path";
import { promisify } from "node:util";
const exec = promisify(execFile);
const DIFF_OPTIONS = [
    "--no-ext-diff",
    "--no-textconv",
    "--no-color"
];
const MAX_PATCH_BYTES = 16 * 1024 * 1024;
async function git(cwd, args, allowDifference = false) {
    try {
        const { stdout } = await exec("git", [
            "--no-pager",
            "-c",
            "core.quotePath=false",
            ...args
        ], {
            cwd,
            encoding: "utf8",
            maxBuffer: MAX_PATCH_BYTES,
            timeout: 30_000,
            env: {
                ...process.env,
                GIT_OPTIONAL_LOCKS: "0"
            }
        });
        return stdout;
    } catch (error) {
        const failure = error;
        if (allowDifference && failure.code === 1) return failure.stdout ?? "";
        throw new Error(`git ${args[0]} failed: ${failure.stderr?.trim() || failure.message}`);
    }
}
async function captureCommit(root, head) {
    const parents = (await git(root, [
        "rev-list",
        "--parents",
        "-n",
        "1",
        head
    ])).trim().split(" ");
    const base = parents[1] ?? null;
    const diffArgs = base ? [
        "diff",
        base,
        head
    ] : [
        "show",
        "--format=",
        "--root",
        head
    ];
    const patch = await git(root, [
        diffArgs[0],
        ...DIFF_OPTIONS,
        ...diffArgs.slice(1),
        "--"
    ]);
    const files = (await git(root, [
        diffArgs[0],
        "--name-only",
        "-z",
        ...diffArgs.slice(1),
        "--"
    ])).split("\0").filter(Boolean);
    return {
        head,
        base,
        files,
        patch
    };
}
export async function captureChange(cwd, reference) {
    const root = (await git(cwd, [
        "rev-parse",
        "--show-toplevel"
    ])).trim();
    const head = (await git(root, [
        "rev-parse",
        "--verify",
        "--quiet",
        "HEAD"
    ], true)).trim() || null;
    const status = await git(root, [
        "status",
        "--porcelain=v1",
        "--untracked-files=all"
    ]);
    if (reference !== undefined) {
        const resolved = (await git(root, [
            "rev-parse",
            "--verify",
            "--end-of-options",
            `${reference}^{commit}`
        ])).trim();
        const commit = await captureCommit(root, resolved);
        if (!commit.patch.trim()) throw new Error("The reference commit has no reviewable change.");
        return {
            root,
            head,
            base: commit.base,
            referenceCommit: resolved,
            scope: "current tree guided by reference commit",
            status,
            files: commit.files,
            patch: commit.patch
        };
    }
    const untracked = (await git(root, [
        "ls-files",
        "--others",
        "--exclude-standard",
        "-z"
    ])).split("\0").filter(Boolean);
    const trackedFiles = head && status.length > 0 ? (await git(root, [
        "diff",
        "--name-only",
        "-z",
        head,
        "--"
    ])).split("\0").filter(Boolean) : [];
    const dirty = status.length > 0;
    let patch;
    let files;
    let base = head;
    let latestCommit;
    let latestCommitUnavailable;
    if (dirty) {
        if (head) {
            patch = await git(root, [
                "diff",
                ...DIFF_OPTIONS,
                head,
                "--"
            ]);
            files = trackedFiles;
        } else {
            patch = "# Staged additions (unborn repository)\n" + await git(root, [
                "diff",
                ...DIFF_OPTIONS,
                "--cached",
                "--"
            ]) + "\n# Unstaged changes relative to the index\n" + await git(root, [
                "diff",
                ...DIFF_OPTIONS,
                "--"
            ]);
            files = (await git(root, [
                "ls-files",
                "-z"
            ])).split("\0").filter(Boolean);
        }
        if (untracked.length > 500) throw new Error("More than 500 untracked files. Ignore generated files or stage the intended change before /prune.");
        let patchBytes = Buffer.byteLength(patch);
        if (patchBytes > MAX_PATCH_BYTES) throw new Error("Tracked patch exceeds the 16 MiB review capture limit. Narrow the change before /prune.");
        for (const file of untracked){
            const addition = await git(root, [
                "diff",
                ...DIFF_OPTIONS,
                "--no-index",
                "--",
                "/dev/null",
                file
            ], true);
            patchBytes += 1 + Buffer.byteLength(addition);
            if (patchBytes > MAX_PATCH_BYTES) {
                throw new Error("Change exceeds the 16 MiB review capture limit. Narrow the change before /prune.");
            }
            patch += "\n" + addition;
        }
        files = [
            ...new Set([
                ...files,
                ...untracked
            ])
        ];
        if (!files.length || !patch.trim()) {
            throw new Error("Git reports changes but no reviewable patch (possibly a dirty submodule). Review that repository directly.");
        }
        if (head) {
            try {
                latestCommit = await captureCommit(root, head);
            } catch (error) {
                latestCommitUnavailable = error instanceof Error ? error.message : String(error);
            }
        }
    } else {
        if (!head) throw new Error("No changes or commits to review.");
        const commit = await captureCommit(root, head);
        ({ base, patch, files } = commit);
        if (!patch.trim()) throw new Error("The latest commit has no reviewable change.");
    }
    return {
        root,
        head,
        base,
        scope: dirty ? "uncommitted changes" : "latest commit (first-parent comparison)",
        status,
        files,
        patch,
        ...latestCommit ? {
            latestCommit
        } : {},
        ...latestCommitUnavailable ? {
            latestCommitUnavailable
        } : {}
    };
}
// Lockfiles and files marked linguist-vendored or linguist-generated are not anyone's code to prune.
const LOCKFILE = /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?|Cargo\.lock|poetry\.lock|Gemfile\.lock|go\.sum)$/;
export async function captureModule(cwd, paths) {
    const root = (await git(cwd, [
        "rev-parse",
        "--show-toplevel"
    ])).trim();
    const head = (await git(root, [
        "rev-parse",
        "--verify",
        "--quiet",
        "HEAD"
    ], true)).trim() || null;
    const status = await git(root, [
        "status",
        "--porcelain=v1",
        "--untracked-files=all"
    ]);
    // Paths are relative to the session's directory, like any shell argument; --full-name makes the output root-relative.
    const listed = (await git(cwd, [
        "ls-files",
        "--full-name",
        "--cached",
        "--others",
        "--exclude-standard",
        "-z",
        "--",
        ...paths
    ])).split("\0").filter(Boolean);
    if (!listed.length) throw new Error(`No files under ${paths.join(", ")}.`);
    const attributes = (await git(root, [
        "check-attr",
        "-z",
        "linguist-vendored",
        "linguist-generated",
        "--",
        ...listed
    ])).split("\0");
    const excluded = new Set();
    for(let index = 0; index + 2 < attributes.length; index += 3){
        if (attributes[index + 2] === "set" || attributes[index + 2] === "true") excluded.add(attributes[index]);
    }
    const files = [];
    for (const file of listed){
        if (excluded.has(file) || LOCKFILE.test(file)) continue;
        const sample = await readFile(join(root, file)).then((content)=>content.subarray(0, 8000), ()=>null);
        if (sample && !sample.includes(0)) files.push(file);
    }
    const prefix = (await git(cwd, [
        "rev-parse",
        "--show-prefix"
    ])).trim();
    if (!files.length) throw new Error(`Only vendored, generated, binary or lock files under ${paths.join(", ")}.`);
    return {
        root,
        head,
        mode: "module",
        // Root-relative, so --verify resolves them the same way from the root.
        paths: paths.map((path)=>posix.normalize(prefix + path)),
        scope: `module review of ${paths.map((path)=>posix.normalize(prefix + path)).join(", ")} as it stands`,
        status,
        files,
        excluded: listed.length - files.length
    };
}

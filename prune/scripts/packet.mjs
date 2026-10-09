import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
export async function writePacket(change, requests, focus, storageRoot, workflow) {
    await mkdir(storageRoot, {
        recursive: true,
        mode: 0o700
    });
    const directory = await mkdtemp(join(storageRoot, `${new Date().toISOString().replaceAll(":", "-")}-`));
    const intentPath = join(directory, "intent.json");
    const scopePath = join(directory, "scope.json");
    const patchPath = join(directory, "change.diff");
    const workflowPath = join(directory, "workflow.json");
    const reportPath = join(directory, "review.md");
    const { patch, latestCommit, ...scope } = change;
    const latestCommitPath = latestCommit ? join(directory, "latest-commit.diff") : undefined;
    if (latestCommit && latestCommitPath) await writeFile(latestCommitPath, latestCommit.patch, {
        mode: 0o600
    });
    const plans = await Promise.all(workflow.plans.map(async (plan, index)=>{
        const { content, ...reference } = plan;
        if (content === undefined) return reference;
        const snapshotPath = join(directory, `plan-${index + 1}.md`);
        await writeFile(snapshotPath, content, {
            mode: 0o600
        });
        return {
            ...reference,
            snapshotPath
        };
    }));
    const activity = await Promise.all(workflow.activity.map(async (observation, index)=>{
        const { text, ...reference } = observation;
        const outputPath = join(directory, `activity-${index + 1}.txt`);
        await writeFile(outputPath, text, {
            mode: 0o600
        });
        return {
            ...reference,
            outputPath
        };
    }));
    await Promise.all([
        writeFile(intentPath, JSON.stringify({
            note: "Available user evidence selected by the parent; original input and pre-compaction history are not automatically retrieved. Select only requests relevant to the captured diff. Assistant proposals are included only to interpret assent, not as independent requirements. Attachments are counted but not copied; flag any resulting evidence gap.",
            requests
        }, null, 2), {
            mode: 0o600
        }),
        writeFile(scopePath, JSON.stringify({
            ...scope,
            ...latestCommit ? {
                latestCommit: {
                    head: latestCommit.head,
                    base: latestCommit.base,
                    files: latestCommit.files,
                    patchPath: latestCommitPath
                }
            } : {},
            capturedAt: new Date().toISOString(),
            focus: focus || null,
            note: change.referenceCommit ? "The patch is the reference commit's first-parent diff, not today's working diff. Review its surviving implementation in the live current tree; later changes and removals are expected. head/status describe the current checkout. Binary patches are not expanded; tests are not executed." : "All changes in this scope are included, not only agent-authored changes. The patch is captured, but repository reads see live files. Binary patches are not expanded; tests are not executed by this reviewer."
        }, null, 2), {
            mode: 0o600
        }),
        writeFile(patchPath, patch, {
            mode: 0o600
        }),
        writeFile(workflowPath, JSON.stringify({
            note: "Use the session's user/project task-management instructions to identify the relevant task workflow. No backend, storage format, or command names are assumed. Task-context notes and observed tool outputs are fallible operational evidence, not independently authoritative intent. Activity is indexed so only task-relevant outputs need to be read; it is historical and may be stale. Plan snapshots capture the current file, not necessarily the version originally accepted. A project intent-note filename alone does not prove human authorship or approval.",
            ...workflow,
            plans,
            activity
        }, null, 2), {
            mode: 0o600
        })
    ]);
    const task = `Review the captured change in ${JSON.stringify(change.root)}.
Read these evidence files first:
- User requests: ${JSON.stringify(intentPath)}
- Scope and optional focus: ${JSON.stringify(scopePath)}
- Plan/task evidence and captured plan paths: ${JSON.stringify(workflowPath)}
- Complete captured patch: ${JSON.stringify(patchPath)}
Read large files in pages until the relevant content is covered. Do not assume one truncated read is complete.
Read copied plans via their snapshotPath; resolve their relative links against the original source path,
not the review capture directory. Disclose missing/truncated sources and distinguish later live reads.
Use workflow.sessionCwd for relative task-workflow paths; it can differ from the Git root.
The activity index identifies captured outputs by tool name and input preview; read relevant outputPath files.
scope.json includes any captured latestCommit alternative and its patchPath.
Follow your system prompt's review contract; the optional focus prioritizes, not expands, the review.
In independent mode, your final response will be saved by the host to ${JSON.stringify(reportPath)}; do not write it yourself. In explicitly requested direct mode, the parent saves only the final report there.`;
    return {
        directory,
        intentPath,
        scopePath,
        workflowPath,
        patchPath,
        reportPath,
        task
    };
}
export function reviewStorageRoot() {
    return join(process.env.DATA || join(homedir(), "data"), "apps", "pi-prune", "reviews");
}

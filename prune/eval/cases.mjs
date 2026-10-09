export const REVIEW_CASES = [
    {
        id: "01",
        request: "Follow the runtime's current thinking level when registering a reviewer. Keep the high fallback. Runtime overrides remain authoritative.",
        before: {
            "runtime.ts": `export type ThinkingLevel = "off" | "low" | "medium" | "high" | "max";
export interface Runtime {
  currentThinking(): ThinkingLevel | undefined;
  // The external API validates supported levels at runtime but declares string.
  registerAgent(definition: { thinking: string }): void;
}
`,
            "reviewer.ts": `import type { Runtime } from "./runtime.ts";
export function registerReviewer(runtime: Runtime) {
  runtime.registerAgent({ thinking: "high" });
}
`
        },
        after: {
            "reviewer.ts": `import type { Runtime } from "./runtime.ts";
export function registerReviewer(runtime: Runtime) {
  runtime.registerAgent({ thinking: runtime.currentThinking() ?? "high" });
}
`,
            "reviewer.test.ts": `import assert from "node:assert/strict";
import { test } from "node:test";
import { registerReviewer } from "./reviewer.ts";
for (const level of ["off", "low", "medium", "high", "max", undefined] as const) {
  test(String(level), () => {
    let thinking: string | undefined;
    registerReviewer({ currentThinking: () => level, registerAgent(definition) { thinking = definition.thinking; } });
    assert.equal(thinking, level ?? "high");
  });
}
`
        },
        rubric: {
            catch: [
                "KEEP with no findings: the requested thinking inheritance is direct, preserves off and keeps the high fallback."
            ],
            avoid: [
                "Do not suggest definition types, extracted builders, extra artifacts or tests without a demonstrated problem.",
                "Do not demand a configuration subsystem, reject the requested fallback or invent a failure for off."
            ]
        }
    },
    {
        id: "02",
        request: "Use a temporary subscription while loading a report. Always release it, including when loading fails; preserve and propagate the original failure.",
        before: {
            "report.ts": `export interface Reports { load(): Promise<string> }
export function loadReport(reports: Reports) { return reports.load(); }
`
        },
        after: {
            "report.ts": `export interface Reports {
  subscribe(): { dispose(): void };
  load(): Promise<string>;
}
export async function loadReport(reports: Reports) {
  const subscription = reports.subscribe();
  const report = await reports.load();
  subscription.dispose();
  return report;
}
`,
            "report.test.ts": `import assert from "node:assert/strict";
import { test } from "node:test";
import { loadReport } from "./report.ts";
test("releases subscription", async () => {
  let released = false;
  const report = await loadReport({ subscribe: () => ({ dispose() { released = true; } }), load: async () => "report" });
  assert.equal(report, "report");
  assert.equal(released, true);
});
`
        },
        rubric: {
            catch: [
                "Identify the leaked subscription when load rejects; propose try/finally without swallowing the load error. Target verification at disposal and original error propagation on rejection."
            ],
            avoid: [
                "Do not treat success-only coverage as an independent defect or merely request generic edge cases.",
                "Do not replace failure with an empty successful report or introduce a resource framework."
            ]
        }
    },
    {
        id: "03",
        request: "Add refund CSV export with the same escaping rules as invoice export. Preserve the public invoice and refund APIs.",
        before: {
            "csv.ts": `export function formatRow(values: readonly string[]): string {
  return values.map(value => /[",\\n]/.test(value) ? '"' + value.replaceAll('"', '""') + '"' : value).join(",");
}
`,
            "invoices.ts": `import { formatRow } from "./csv.ts";
export function invoiceCsv(id: string, customer: string) { return formatRow([id, customer]); }
`
        },
        after: {
            "refunds.ts": `export function refundCsv(id: string, reason: string): string {
  const values = [id, reason];
  return values.map(value => /[",\\n]/.test(value) ? '"' + value.replaceAll('"', '""') + '"' : value).join(",");
}
`,
            "refunds.test.ts": `import assert from "node:assert/strict";
import { test } from "node:test";
import { refundCsv } from "./refunds.ts";
test("escapes refund fields", () => {
  assert.equal(refundCsv("r1", 'a,"b"'), 'r1,"a,""b"""');
  assert.equal(refundCsv("r1", "a\\nb"), 'r1,"a\\nb"');
});
`
        },
        rubric: {
            catch: [
                "Read csv.ts and invoices.ts, cite both the new copy and existing formatRow, and propose reusing formatRow inside refundCsv while keeping its public API."
            ],
            avoid: [
                "Do not suggest a new generic CSV abstraction instead of using the existing implementation.",
                "Do not report existing formatRow as a newly introduced defect or demand DRY test assertions."
            ]
        }
    },
    {
        id: "04",
        request: "Add a statusLabel function that returns Ready or Busy from an idle boolean. No alternate formats or runtime plugin selection are needed.",
        before: {
            "status.ts": "export const applicationName = 'Reports';\n"
        },
        after: {
            "status.ts": `interface LabelFormatter { format(idle: boolean): string }
class DefaultLabelFormatter implements LabelFormatter {
  format(idle: boolean) { return idle ? "Ready" : "Busy"; }
}
class LabelFormatterRegistry {
  private formatters = new Map<string, LabelFormatter>();
  register(name: string, formatter: LabelFormatter) { this.formatters.set(name, formatter); }
  get(name: string) {
    const formatter = this.formatters.get(name);
    if (!formatter) throw new Error("Unknown formatter");
    return formatter;
  }
}
const registry = new LabelFormatterRegistry();
registry.register("default", new DefaultLabelFormatter());
export function statusLabel(idle: boolean): string { return registry.get("default").format(idle); }
export const applicationName = 'Reports';
`,
            "status.test.ts": `import assert from "node:assert/strict";
import { test } from "node:test";
import { statusLabel } from "./status.ts";
test("labels idle and busy", () => {
  assert.equal(statusLabel(true), "Ready");
  assert.equal(statusLabel(false), "Busy");
});
`
        },
        rubric: {
            catch: [
                "Recommend removing the private interface/class/registry machinery in favor of the direct conditional in statusLabel, preserving the public behavior and tests."
            ],
            avoid: [
                "Do not remove applicationName or invent future plugin requirements.",
                "Do not recommend rebuilding the whole repository for this local simplification."
            ]
        }
    },
    {
        id: "05",
        request: "Validate externally supplied quantities as positive safe integers before reserving stock. Do not call stock.reserve for invalid input; propagate reservation failures unchanged.",
        before: {
            "stock.ts": `export interface Stock { reserve(quantity: number): Promise<void> }
`
        },
        after: {
            "stock.ts": `export interface Stock { reserve(quantity: number): Promise<void> }
export async function reserveStock(quantity: unknown, stock: Stock): Promise<void> {
  if (typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive safe integer");
  }
  await stock.reserve(quantity);
}
`,
            "stock.test.ts": `import assert from "node:assert/strict";
import { test } from "node:test";
import { reserveStock } from "./stock.ts";
test("rejects invalid external quantities without touching stock", async () => {
  let calls = 0;
  const stock = { async reserve() { calls++; } };
  for (const value of [null, "2", 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(reserveStock(value, stock), /positive safe integer/);
  }
  assert.equal(calls, 0);
});
test("reserves exactly the requested quantity, including valid endpoints", async () => {
  const quantities: number[] = [];
  for (const quantity of [1, 2, Number.MAX_SAFE_INTEGER]) {
    await reserveStock(quantity, { async reserve(value) { quantities.push(value); } });
  }
  assert.deepEqual(quantities, [1, 2, Number.MAX_SAFE_INTEGER]);
});
test("preserves reservation failures", async () => {
  const failure = new Error("sold out");
  await assert.rejects(reserveStock(2, { async reserve() { throw failure; } }), error => error === failure);
});
`
        },
        rubric: {
            catch: [
                "KEEP with no findings; retain the required external validation and error propagation."
            ],
            avoid: [
                "Do not delete required validation as defensive slop, narrow the external input to number, or demand an error wrapper.",
                "Do not invent missing error propagation coverage; the test asserts error identity."
            ]
        }
    },
    {
        id: "06",
        request: "Add two independent provider polling adapters. Alpha and Beta have separate product owners and release schedules; keep their retry policies independent.",
        before: {
            "providers.ts": "export type Poll = () => Promise<string>;\n"
        },
        after: {
            "providers.ts": `export type Poll = () => Promise<string>;
`,
            "alpha.ts": `import type { Poll } from "./providers.ts";
export async function pollAlpha(poll: Poll): Promise<string> {
  try { return await poll(); }
  catch { return await poll(); }
}
`,
            "beta.ts": `import type { Poll } from "./providers.ts";
export async function pollBeta(poll: Poll): Promise<string> {
  try { return await poll(); }
  catch { return await poll(); }
}
`,
            "providers.test.ts": `import assert from "node:assert/strict";
import { test } from "node:test";
import { pollAlpha } from "./alpha.ts";
import { pollBeta } from "./beta.ts";
for (const adapter of [pollAlpha, pollBeta]) {
  test(adapter.name, async () => {
    let calls = 0;
    assert.equal(await adapter(async () => { calls++; return "ok"; }), "ok");
    assert.equal(calls, 1);
    calls = 0;
    assert.equal(await adapter(async () => { if (++calls === 1) throw new Error("retry"); return "ok"; }), "ok");
    assert.equal(calls, 2);
    const firstFailure = new Error("initial attempt failed");
    const retryFailure = new Error("retry failed");
    calls = 0;
    await assert.rejects(adapter(async () => { throw ++calls === 1 ? firstFailure : retryFailure; }), error => error === retryFailure);
    assert.equal(calls, 2);
  });
}
`
        },
        rubric: {
            catch: [
                "KEEP with no findings: the matching adapter shapes implement explicitly independent policies."
            ],
            avoid: [
                "Do not force a shared retry abstraction on syntax alone.",
                "Do not insist the test loop also be factored into a framework or claim tests were executed."
            ]
        }
    },
    {
        id: "07",
        request: null,
        before: {
            "labels.ts": `export function labels(values: readonly string[]): string[] { return values.map(value => value.trim()); }
`
        },
        after: {
            "labels.ts": `export function labels(values: readonly string[]): string[] {
  const result: string[] = [];
  for (const value of values) {
    if (value.length >= 0) {
      result.push(value.trim());
    }
  }
  return result;
}
`
        },
        rubric: {
            catch: [
                "Disclose missing human intent but still identify the always-true length >= 0 guard and unnecessary control flow; propose a behavior-preserving simplification."
            ],
            avoid: [
                "Do not stop at NEEDS INTENT or infer an unstated product requirement.",
                "Do not fabricate a numeric cognitive-complexity score or claim a test suite exists."
            ]
        }
    }
];

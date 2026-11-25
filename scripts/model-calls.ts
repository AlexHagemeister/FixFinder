// `bun run model-calls`: saves every model call record to model-calls.json and prints the totals (issue #12).
// The records live in the Worker's database. This reads them through the Worker, so it needs no Cloudflare login.
// Pass a branch preview link to read through that preview instead: `bun run model-calls https://<branch>-fixfinder...`.
// An agent can search model-calls.json with jq, for example: jq '.calls[] | select(.operation == "describe")'

import { writeFile } from "node:fs/promises";

const base = process.argv[2] ?? "https://fixfinder.alexhagemeister.workers.dev";

interface Totals {
  costUsd: number;
  calls: number;
  callsWithoutCost: number;
  byOperation: { operation: string; calls: number; costUsd: number }[];
  mostExpensiveOperation: string | null;
}

const response = await fetch(new URL("/api/model-calls", base));
if (!response.ok) {
  console.error(`Could not read the model call records from ${base}: ${response.status} ${response.statusText}`);
  process.exit(1);
}
const records = (await response.json()) as { totals: Totals; calls: unknown[] };
await writeFile("model-calls.json", JSON.stringify(records, null, 2) + "\n");

const dollars = (n: number) => `$${n.toFixed(4)}`;
const { totals } = records;
console.log(`Saved ${totals.calls} model calls to model-calls.json\n`);
console.log(`Total spend: ${dollars(totals.costUsd)}`);
console.log(`Most expensive operation: ${totals.mostExpensiveOperation ?? "none yet"}`);
for (const t of totals.byOperation) console.log(`  ${t.operation}: ${dollars(t.costUsd)} over ${t.calls} calls`);
if (totals.callsWithoutCost > 0) {
  console.log(`\n${totals.callsWithoutCost} calls came back with no cost from OpenRouter and count as $0 above.`);
}

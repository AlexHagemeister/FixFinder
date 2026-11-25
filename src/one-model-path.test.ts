// Issue #12: every OpenRouter call goes through worker/model-calls.ts, so none can skip being recorded. This fails when
// any other tracked source file imports the OpenRouter provider, calls OpenRouter's API, or reads the OpenRouter key.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
const theOnePath = "worker/model-calls.ts";
// The key is the real gate: a client built any other way still needs it. Plain mentions of "OpenRouter" in comments
// and messages are fine, so the pattern looks only for these three.
const reachesOpenRouter = /@openrouter\/|openrouter\.ai|OPENROUTER_API_KEY/;

// Every source file in the repo that git does not ignore, committed or not, apart from generated type files.
const sourceFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter((path) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path) && !path.endsWith(".d.ts"));

it("reaches OpenRouter only from worker/model-calls.ts", () => {
  const offenders = sourceFiles
    .filter((path) => path !== theOnePath && !path.endsWith("one-model-path.test.ts"))
    .filter((path) => reachesOpenRouter.test(readFileSync(join(root, path), "utf8")));

  expect(offenders).toEqual([]);
});

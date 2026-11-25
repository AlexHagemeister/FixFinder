// Issue #12: every OpenRouter call goes through worker/model-calls.ts, so none can skip being recorded. This fails when
// any other source file imports the OpenRouter provider or calls OpenRouter's API directly.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
const theOnePath = "worker/model-calls.ts";
const reachesOpenRouter = /@openrouter\/|openrouter\.ai\/api/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|js|mjs)$/.test(name) && !name.endsWith(".d.ts") ? [path] : [];
  });
}

it("reaches OpenRouter only from worker/model-calls.ts", () => {
  const offenders = ["src", "worker", "scripts"]
    .flatMap((dir) => sourceFiles(join(root, dir)))
    .map((path) => relative(root, path))
    .filter((path) => path !== theOnePath && !path.endsWith("one-model-path.test.ts"))
    .filter((path) => reachesOpenRouter.test(readFileSync(join(root, path), "utf8")));

  expect(offenders).toEqual([]);
});

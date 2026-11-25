// The one path to OpenRouter (issue #12). Every model the Worker uses comes from `openRouterModel`, which wraps it so
// each call the model makes, whether through generateText, streamText, or one step of a tool loop, leaves a record of
// what it was for and what it cost. No other file may import the OpenRouter provider: src/one-model-path.test.ts checks.

import { createOpenRouter, type OpenRouterChatSettings } from "@openrouter/ai-sdk-provider";
import { wrapLanguageModel, type LanguageModel, type LanguageModelMiddleware } from "ai";

/** One model call, as the record keeps it. No photos, prompts, or answers. */
export interface ModelCallRecord {
  /** When the call finished, as an ISO 8601 UTC timestamp. */
  time: string;
  /** The app's name for the step that made the call, like "describe". */
  operation: string;
  /** The OpenRouter model id. */
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** OpenRouter's usage.cost for the call, in US dollars. Null when OpenRouter did not report one. */
  costUsd: number | null;
}

export interface ModelCallsEnv {
  OPENROUTER_API_KEY: string;
  MODEL_CALLS_DB: D1Database;
}

/** OpenRouter's settings for a model, such as how much it reasons. worker/models.ts names them for each step. */
export type ModelSettings = Omit<OpenRouterChatSettings, "usage">;

/** An OpenRouter model whose every call is recorded under `operation`. */
export function openRouterModel(
  env: ModelCallsEnv,
  operation: string,
  modelId: string,
  settings: ModelSettings = {},
): LanguageModel {
  const openrouter = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
  // usage.include asks OpenRouter to report each call's cost in its answer, so no second request is needed.
  return recordedModel(openrouter(modelId, { ...settings, usage: { include: true } }), operation, (record) =>
    saveModelCall(env.MODEL_CALLS_DB, record),
  );
}

type Usage = { inputTokens: { total: number | undefined }; outputTokens: { total: number | undefined } };
const noUsage: Usage = { inputTokens: { total: undefined }, outputTokens: { total: undefined } };

/** Wraps a model so each call hands its record to `save`. Exported for tests, which pass a mock model. */
export function recordedModel(
  model: Parameters<typeof wrapLanguageModel>[0]["model"],
  operation: string,
  save: (record: ModelCallRecord) => Promise<void>,
): LanguageModel {
  const record = async (modelId: string, usage: Usage, providerMetadata: unknown) => {
    try {
      await save({
        time: new Date().toISOString(),
        operation,
        model: modelId,
        inputTokens: usage.inputTokens.total ?? 0,
        outputTokens: usage.outputTokens.total ?? 0,
        costUsd: openRouterCost(providerMetadata),
      });
    } catch (error) {
      // A lost record must not cost the user their answer, but it must be loud: unrecorded spend is the thing #12 is for.
      console.error(`FixFinder could not record a model call (${operation}, ${modelId})`, error);
    }
  };

  // A call that fails or is cut off may still have been billed, so it gets a row too. OpenRouter reports cost only in
  // a finished answer, so the row has no tokens or cost and shows up in the totals' callsWithoutCost.
  const unfinished = async (modelId: string, what: string, error?: unknown) => {
    console.error(`FixFinder recorded a model call that ${what}, with no cost (${operation}, ${modelId})`, error);
    await record(modelId, noUsage, undefined);
  };

  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v4",
    wrapGenerate: async ({ doGenerate, model }) => {
      let result;
      try {
        result = await doGenerate();
      } catch (error) {
        await unfinished(model.modelId, "failed", error);
        throw error;
      }
      await record(result.response?.modelId ?? model.modelId, result.usage, result.providerMetadata);
      return result;
    },
    wrapStream: async ({ doStream, model }) => {
      let result;
      try {
        result = await doStream();
      } catch (error) {
        await unfinished(model.modelId, "failed", error);
        throw error;
      }
      let modelId = model.modelId;
      let recorded = false;
      const reader = result.stream.getReader();
      return {
        ...result,
        stream: new ReadableStream({
          async pull(controller) {
            try {
              const { done, value: part } = await reader.read();
              if (done) {
                if (!recorded) {
                  recorded = true;
                  await unfinished(modelId, "ended without finishing");
                }
                controller.close();
                return;
              }
              if (part.type === "response-metadata" && part.modelId) modelId = part.modelId;
              if (part.type === "finish" && !recorded) {
                recorded = true;
                await record(modelId, part.usage, part.providerMetadata);
              }
              controller.enqueue(part);
            } catch (error) {
              if (!recorded) {
                recorded = true;
                await unfinished(modelId, "was cut off", error);
              }
              controller.error(error);
            }
          },
          async cancel(reason) {
            if (!recorded) {
              recorded = true;
              await unfinished(modelId, "was cancelled", reason);
            }
            await reader.cancel(reason);
          },
        }),
      };
    },
  };

  return wrapLanguageModel({ model, middleware });
}

/** The cost OpenRouter reported for a call, from the provider metadata its AI SDK provider attaches. */
function openRouterCost(providerMetadata: unknown): number | null {
  const cost = (providerMetadata as { openrouter?: { usage?: { cost?: unknown } } } | undefined)?.openrouter?.usage
    ?.cost;
  return typeof cost === "number" ? cost : null;
}

async function saveModelCall(db: D1Database, record: ModelCallRecord): Promise<void> {
  await db
    .prepare(
      "INSERT INTO model_calls (time, operation, model, input_tokens, output_tokens, cost_usd) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(record.time, record.operation, record.model, record.inputTokens, record.outputTokens, record.costUsd)
    .run();
}

/** Every record, oldest first. */
export async function listModelCalls(db: D1Database): Promise<ModelCallRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT time, operation, model, input_tokens AS inputTokens, output_tokens AS outputTokens, cost_usd AS costUsd
       FROM model_calls ORDER BY id`,
    )
    .all<ModelCallRecord>();
  return results;
}

export interface OperationTotal {
  operation: string;
  calls: number;
  costUsd: number;
}

export interface ModelCallTotals {
  /** Total spend across every recorded call, in US dollars. */
  costUsd: number;
  calls: number;
  /** Calls OpenRouter reported no cost for. They count as zero in the totals, so a nonzero number here needs a look. */
  callsWithoutCost: number;
  /** Each operation's calls and spend, most expensive first. */
  byOperation: OperationTotal[];
  /** The operation with the highest total spend, or null when there are no records. */
  mostExpensiveOperation: string | null;
}

export function totalModelCalls(records: ModelCallRecord[]): ModelCallTotals {
  const byOperation = new Map<string, OperationTotal>();
  for (const record of records) {
    const total = byOperation.get(record.operation) ?? { operation: record.operation, calls: 0, costUsd: 0 };
    total.calls += 1;
    total.costUsd += record.costUsd ?? 0;
    byOperation.set(record.operation, total);
  }
  const operations = [...byOperation.values()].sort((a, b) => b.costUsd - a.costUsd);
  return {
    costUsd: operations.reduce((sum, total) => sum + total.costUsd, 0),
    calls: records.length,
    callsWithoutCost: records.filter((record) => record.costUsd === null).length,
    byOperation: operations,
    mostExpensiveOperation: operations[0]?.operation ?? null,
  };
}

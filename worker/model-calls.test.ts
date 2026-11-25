// @vitest-environment node
import { generateText, stepCountIs, streamText, tool } from "ai";
import { MockLanguageModelV4, convertArrayToReadableStream } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { recordedModel, totalModelCalls, type ModelCallRecord } from "./model-calls.ts";

const usage = (input: number, output: number) => ({
  inputTokens: { total: input, noCache: input, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: output, text: output, reasoning: 0 },
});

const openRouterMetadata = (cost: number) => ({ openrouter: { usage: { cost } } });

function mockAnswer(text: string, cost: number | null) {
  return {
    content: [{ type: "text" as const, text }],
    finishReason: { unified: "stop" as const, raw: "stop" },
    usage: usage(100, 10),
    providerMetadata: cost === null ? undefined : openRouterMetadata(cost),
    response: { modelId: "test/model" },
    warnings: [],
  };
}

describe("recordedModel", () => {
  it("records one call with its operation, model, tokens, and cost", async () => {
    const saved: ModelCallRecord[] = [];
    const model = recordedModel(new MockLanguageModelV4({ doGenerate: mockAnswer("Pothole", 0.00042) }), "describe", async (r) => {
      saved.push(r);
    });

    const result = await generateText({ model, prompt: "What is in this photo?" });

    expect(result.text).toBe("Pothole");
    expect(saved).toEqual([
      {
        time: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        operation: "describe",
        model: "test/model",
        inputTokens: 100,
        outputTokens: 10,
        costUsd: 0.00042,
      },
    ]);
  });

  it("records each step of a tool loop as its own call", async () => {
    const saved: ModelCallRecord[] = [];
    const toolCallStep = {
      content: [{ type: "tool-call" as const, toolCallId: "1", toolName: "lookUp", input: '{"id":"public-works"}' }],
      finishReason: { unified: "tool-calls" as const, raw: "tool_calls" },
      usage: usage(200, 20),
      providerMetadata: openRouterMetadata(0.001),
      response: { modelId: "test/model" },
      warnings: [],
    };
    const model = recordedModel(
      new MockLanguageModelV4({ doGenerate: [toolCallStep, mockAnswer("Berkeley Public Works", 0.002)] }),
      "findResponsibleParty",
      async (r) => {
        saved.push(r);
      },
    );

    await generateText({
      model,
      prompt: "Who fixes this?",
      tools: { lookUp: tool({ inputSchema: z.object({ id: z.string() }), execute: async () => ({ found: true }) }) },
      stopWhen: stepCountIs(3),
    });

    expect(saved.map((r) => r.costUsd)).toEqual([0.001, 0.002]);
    expect(saved.every((r) => r.operation === "findResponsibleParty")).toBe(true);
  });

  it("records a streamed call when the stream finishes", async () => {
    const saved: ModelCallRecord[] = [];
    const model = recordedModel(
      new MockLanguageModelV4({
        doStream: {
          stream: convertArrayToReadableStream([
            { type: "response-metadata", modelId: "test/streamed" },
            { type: "text-start", id: "t" },
            { type: "text-delta", id: "t", delta: "Pothole" },
            { type: "text-end", id: "t" },
            {
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: usage(50, 5),
              providerMetadata: openRouterMetadata(0.0003),
            },
          ]),
        },
      }),
      "draftReportText",
      async (r) => {
        saved.push(r);
      },
    );

    const result = streamText({ model, prompt: "Draft it" });
    expect(await result.text).toBe("Pothole");
    expect(saved).toMatchObject([{ operation: "draftReportText", model: "test/streamed", costUsd: 0.0003 }]);
  });

  it("keeps the answer when the record cannot be saved, and says so loudly", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const model = recordedModel(new MockLanguageModelV4({ doGenerate: mockAnswer("Pothole", 0.0001) }), "describe", async () => {
      throw new Error("database unavailable");
    });

    const result = await generateText({ model, prompt: "What is in this photo?" });

    expect(result.text).toBe("Pothole");
    expect(error).toHaveBeenCalledWith(expect.stringContaining("could not record a model call"), expect.any(Error));
    error.mockRestore();
  });

  it("records a null cost when OpenRouter reports none", async () => {
    const saved: ModelCallRecord[] = [];
    const model = recordedModel(new MockLanguageModelV4({ doGenerate: mockAnswer("Pothole", null) }), "describe", async (r) => {
      saved.push(r);
    });

    await generateText({ model, prompt: "What is in this photo?" });

    expect(saved[0]?.costUsd).toBeNull();
  });
});

describe("totalModelCalls", () => {
  const record = (operation: string, costUsd: number | null): ModelCallRecord => ({
    time: "2026-11-24T00:00:00.000Z",
    operation,
    model: "test/model",
    inputTokens: 1,
    outputTokens: 1,
    costUsd,
  });

  it("totals spend overall and per operation, most expensive first", () => {
    const totals = totalModelCalls([
      record("describe", 0.001),
      record("findResponsibleParty", 0.004),
      record("describe", 0.002),
      record("describe", null),
    ]);

    expect(totals.costUsd).toBeCloseTo(0.007);
    expect(totals.calls).toBe(4);
    expect(totals.callsWithoutCost).toBe(1);
    expect(totals.mostExpensiveOperation).toBe("findResponsibleParty");
    expect(totals.byOperation.map((t) => [t.operation, t.calls])).toEqual([
      ["findResponsibleParty", 1],
      ["describe", 3],
    ]);
    expect(totals.byOperation[1]?.costUsd).toBeCloseTo(0.003);
  });

  it("has no most expensive operation when there are no records", () => {
    expect(totalModelCalls([])).toEqual({
      costUsd: 0,
      calls: 0,
      callsWithoutCost: 0,
      byOperation: [],
      mostExpensiveOperation: null,
    });
  });
});

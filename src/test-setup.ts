import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// Tests never reach the network. A test that needs an answer from a service stubs fetch (or the module) itself, so a
// call nobody stubbed fails loudly here instead of calling the real service from CI.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: unknown) => Promise.reject(new Error(`A test called the network without a stub: ${String(input)}`))),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

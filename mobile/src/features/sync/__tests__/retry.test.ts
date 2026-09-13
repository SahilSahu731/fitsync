/// <reference types="jest" />

import { getRetryDelayMs } from "../retry";

describe("getRetryDelayMs", () => {
  it("backs off progressively", () => {
    expect(getRetryDelayMs(0)).toBe(2_000);

    expect(getRetryDelayMs(1)).toBe(5_000);

    expect(getRetryDelayMs(2)).toBe(15_000);

    expect(getRetryDelayMs(3)).toBe(30_000);
  });

  it("caps retries", () => {
    expect(getRetryDelayMs(99)).toBeLessThanOrEqual(300_000);
  });
});

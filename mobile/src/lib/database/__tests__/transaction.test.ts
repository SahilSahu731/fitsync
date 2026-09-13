import type { SQLiteDatabase } from "expo-sqlite";

import { runSerializedTransaction } from "../transaction";

function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

describe("runSerializedTransaction", () => {
  it("never overlaps transactions on one connection", async () => {
    let active = 0;
    let maximum = 0;
    const gate = deferred();
    const database = {
      withTransactionAsync: async (task: () => Promise<void>) => {
        active += 1;
        maximum = Math.max(maximum, active);
        await task();
        active -= 1;
      },
    } as unknown as SQLiteDatabase;

    const first = runSerializedTransaction(database, async () => {
      await gate.promise;
    });
    const second = runSerializedTransaction(database, async () => undefined);

    gate.release();
    await Promise.all([first, second]);
    expect(maximum).toBe(1);
  });

  it("continues the queue after a failed transaction", async () => {
    const calls: string[] = [];
    const database = {
      withTransactionAsync: async (task: () => Promise<void>) => task(),
    } as unknown as SQLiteDatabase;

    const failed = runSerializedTransaction(database, async () => {
      calls.push("failed");
      throw new Error("rollback");
    });
    const next = runSerializedTransaction(database, async () => {
      calls.push("next");
    });

    await expect(failed).rejects.toThrow("rollback");
    await next;
    expect(calls).toEqual(["failed", "next"]);
  });
});

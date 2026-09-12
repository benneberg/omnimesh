import { describe, it, expect, beforeEach } from "vitest";
import { GlobalDurableObject, defaultEnv } from "../worker/core-utils";
import { durableStorage } from "../worker/durable-storage";

describe("Durable Storage Engine & GlobalDurableObject Actor Model", () => {
  beforeEach(() => {
    durableStorage.clearAll();
  });

  it("handles basic getDoc, casPut and del operations", async () => {
    const doInstance = new GlobalDurableObject("test-partition-1");

    // Initially null
    const initial = await doInstance.getDoc("key1");
    expect(initial).toBeNull();

    // CAS put with expectedV = 0
    const putRes = await doInstance.casPut("key1", 0, { message: "hello mesh" });
    expect(putRes.ok).toBe(true);
    expect(putRes.v).toBe(1);

    // Document retrieved matches
    const doc = await doInstance.getDoc<{ message: string }>("key1");
    expect(doc).not.toBeNull();
    expect(doc?.v).toBe(1);
    expect(doc?.data.message).toBe("hello mesh");

    // Check existence
    expect(await doInstance.has("key1")).toBe(true);

    // Delete
    const deleted = await doInstance.del("key1");
    expect(deleted).toBe(true);
    expect(await doInstance.has("key1")).toBe(false);
  });

  it("rejects CAS put when expected version mismatches (concurrency safety)", async () => {
    const doInstance = new GlobalDurableObject("test-partition-cas");

    // Initial put
    await doInstance.casPut("counter", 0, { val: 1 });

    // Try to update with wrong expectedV
    const staleAttempt = await doInstance.casPut("counter", 0, { val: 999 });
    expect(staleAttempt.ok).toBe(false);
    expect(staleAttempt.v).toBe(1); // reports current version

    // Correct version succeeds
    const validAttempt = await doInstance.casPut("counter", 1, { val: 2 });
    expect(validAttempt.ok).toBe(true);
    expect(validAttempt.v).toBe(2);

    const finalDoc = await doInstance.getDoc<{ val: number }>("counter");
    expect(finalDoc?.data.val).toBe(2);
  });

  it("handles batch index operations and prefix queries", async () => {
    const doInstance = new GlobalDurableObject("test-partition-index");

    await doInstance.indexAddBatch(["node-alpha", "node-bravo", "node-charlie"]);

    const res = await doInstance.listPrefix("i:");
    expect(res.keys).toEqual(["i:node-alpha", "i:node-bravo", "i:node-charlie"]);

    // Limit and pagination
    const paged = await doInstance.listPrefix("i:", null, 2);
    expect(paged.keys).toEqual(["i:node-alpha", "i:node-bravo"]);
    expect(paged.next).toBe("i:node-bravo");

    // Remove single
    const removed = await doInstance.indexRemoveBatch(["node-bravo"]);
    expect(removed).toBe(1);

    const remaining = await doInstance.listPrefix("i:");
    expect(remaining.keys).toEqual(["i:node-alpha", "i:node-charlie"]);
  });

  it("persists partition state into durable storage engine across re-instantiation", async () => {
    const partitionId = "persist-test-session";
    const inst1 = new GlobalDurableObject(partitionId);

    await inst1.casPut("session_state", 0, { active: true, nodes: 42 });
    durableStorage.flushToDisk();

    // Instantiate a new GlobalDurableObject with the same partition ID
    const inst2 = new GlobalDurableObject(partitionId);
    const recovered = await inst2.getDoc<{ active: boolean; nodes: number }>("session_state");

    expect(recovered).not.toBeNull();
    expect(recovered?.v).toBe(1);
    expect(recovered?.data.active).toBe(true);
    expect(recovered?.data.nodes).toBe(42);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadWorkspace,
  saveWorkspaceProject,
  WorkspaceStorageError,
} from "../../src/adapters/workspace-storage";

function request() {
  return {
    result: undefined as unknown,
    error: null as DOMException | null,
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onblocked: null as (() => void) | null,
    onupgradeneeded: null as (() => void) | null,
    transaction: null as { abort: () => void } | null,
    succeed(value: unknown) {
      this.result = value;
      this.onsuccess?.();
    },
    fail(name: string) {
      this.error = new DOMException(name, name);
      this.onerror?.();
    },
  };
}

type Request = ReturnType<typeof request>;

interface TestStore {
  keyPath: string;
  get: (id: string) => Request;
  put: (value: unknown) => Request;
}

interface TestTransaction {
  mode: IDBTransactionMode;
  reads: { id: string; request: Request }[];
  writes: { value: unknown; request: Request }[];
  ended: boolean;
  aborted: boolean;
  error: DOMException | null;
  oncomplete: (() => void) | null;
  onabort: (() => void) | null;
  onerror: (() => void) | null;
  objectStore: (name: string) => TestStore;
  abort: () => void;
  deliverReads: () => void;
  complete: () => void;
}

interface TestConnection {
  objectStoreNames: { contains: (name: string) => boolean };
  createObjectStore: (name: string, options: { keyPath: string }) => void;
  transaction: (name: string, mode: IDBTransactionMode) => TestTransaction;
  close: () => void;
  onversionchange: (() => void) | null;
}

function databaseHarness(initial: Record<string, unknown> = {}) {
  const records = new Map(Object.entries(initial));
  const transactions: TestTransaction[] = [];
  const connections: TestConnection[] = [];
  const openings: Request[] = [];
  const stores = new Set(["projects"]);

  function transaction(mode: IDBTransactionMode): TestTransaction {
    const reads: { id: string; request: Request }[] = [];
    const writes: { value: unknown; request: Request }[] = [];
    const tx: TestTransaction = {
      mode,
      reads,
      writes,
      ended: false,
      aborted: false,
      error: null as DOMException | null,
      oncomplete: null as (() => void) | null,
      onabort: null as (() => void) | null,
      onerror: null as (() => void) | null,
      objectStore: vi.fn((name: string) => {
        expect(name).toBe("projects");
        return {
          keyPath: "id",
          get: vi.fn((id: string) => {
            const next = request();
            reads.push({ id, request: next });
            return next;
          }),
          put: vi.fn((value: unknown) => {
            expect(mode).toBe("readwrite");
            const next = request();
            writes.push({ value, request: next });
            return next;
          }),
        };
      }),
      abort: vi.fn(() => {
        tx.aborted = true;
        tx.ended = true;
        tx.error ??= new DOMException("Aborted", "AbortError");
        tx.onabort?.();
      }),
      deliverReads() {
        // Native IndexedDB serializes readwrite transactions for the same store.
        const prior = transactions.slice(0, transactions.indexOf(tx));
        expect(prior.every((entry) => entry.ended || entry.mode === "readonly")).toBe(true);
        for (const read of reads) {
          if (tx.ended) break;
          read.request.succeed(records.get(read.id));
        }
      },
      complete() {
        if (tx.aborted) return;
        for (const write of writes) {
          const value = write.value as { id: string };
          records.set(value.id, value);
        }
        tx.ended = true;
        tx.oncomplete?.();
      },
    };
    transactions.push(tx);
    return tx;
  }

  function connection(): TestConnection {
    const db: TestConnection = {
      objectStoreNames: { contains: (name: string) => stores.has(name) },
      createObjectStore: vi.fn((name: string, options: { keyPath: string }) => {
        expect(options).toEqual({ keyPath: "id" });
        stores.add(name);
      }),
      transaction: vi.fn((name: string, mode: IDBTransactionMode) => {
        expect(name).toBe("projects");
        return transaction(mode);
      }),
      close: vi.fn(),
      onversionchange: null as (() => void) | null,
    };
    connections.push(db);
    return db;
  }

  const factory = {
    open: vi.fn((name: string, version: number) => {
      expect(name).toBe("brikuma-workspace");
      expect(version).toBe(1);
      const next = request();
      openings.push(next);
      connection();
      return next;
    }),
  };
  vi.stubGlobal("indexedDB", factory);
  return {
    records,
    transactions,
    connections,
    openings,
    stores,
    factory,
    async open(index = 0) {
      openings[index].succeed(connections[index]);
      await Promise.resolve();
      return transactions.at(-1)!;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Browser workspace storage", () => {
  it("reads fixed slots without writes, and waits for the read transaction to complete", async () => {
    const saved = { id: "blank", version: 2, payload: { title: "My model" } };
    const h = databaseHarness({ blank: saved, unrelated: { untouched: true } });
    const settled = vi.fn();
    const pending = loadWorkspace().then(settled);
    const tx = await h.open();
    expect(tx.mode).toBe("readonly");
    expect(tx.reads.map((item) => item.id)).toEqual(["masseria", "rover", "creature", "blank"]);
    tx.deliverReads();
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    expect(tx.writes).toHaveLength(0);
    expect(h.connections[0].close).not.toHaveBeenCalled();
    tx.complete();
    await pending;
    expect(settled).toHaveBeenCalledExactlyOnceWith([saved]);
    expect(h.connections[0].close).toHaveBeenCalledOnce();
    expect(h.records.get("unrelated")).toEqual({ untouched: true });
  });

  it("creates only the schema on first open, without inventing a saved project", async () => {
    const h = databaseHarness();
    h.stores.clear();
    const pending = loadWorkspace();
    h.openings[0].result = h.connections[0];
    h.openings[0].onupgradeneeded?.();
    const tx = await h.open();
    tx.deliverReads();
    tx.complete();
    expect(await pending).toEqual([]);
    expect(h.connections[0].createObjectStore).toHaveBeenCalledOnce();
    expect(h.records.size).toBe(0);
  });

  it("resolves a new version only after commit, even after put succeeds", async () => {
    const h = databaseHarness();
    const payload = { model: { title: "First build" }, image: new Blob(["image"]) };
    const settled = vi.fn();
    const pending = saveWorkspaceProject("blank", payload, null).then(settled);
    const tx = await h.open();
    tx.deliverReads();
    expect(tx.writes).toHaveLength(1);
    expect(tx.writes[0].value).toEqual({ id: "blank", version: 1, payload });
    tx.writes[0].request.succeed("blank");
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    expect(h.records.has("blank")).toBe(false);
    tx.complete();
    await pending;
    expect(settled).toHaveBeenCalledExactlyOnceWith(1);
    expect(h.connections[0].close).toHaveBeenCalledOnce();
  });

  it("rolls back a transaction aborted after a successful put request", async () => {
    const previous = { id: "blank", version: 4, payload: "previous" };
    const h = databaseHarness({ blank: previous });
    const pending = saveWorkspaceProject("blank", "new", 4);
    const failed = expect(pending).rejects.toMatchObject({ code: "unavailable" });
    const tx = await h.open();
    tx.deliverReads();
    tx.writes[0].request.succeed("blank");
    tx.abort();
    await failed;
    expect(h.records.get("blank")).toEqual(previous);
    expect(h.connections[0].close).toHaveBeenCalledOnce();
  });

  it.each([null, 2, 4])(
    "refuses expected version %s when another tab saved version 3",
    async (expected) => {
      const previous = { id: "blank", version: 3, payload: "other tab" };
      const h = databaseHarness({ blank: previous });
      const pending = saveWorkspaceProject("blank", "mine", expected);
      const failed = expect(pending).rejects.toMatchObject({ code: "conflict" });
      const tx = await h.open();
      tx.deliverReads();
      await failed;
      expect(tx.writes).toHaveLength(0);
      expect(h.records.get("blank")).toEqual(previous);
      expect(tx.abort).toHaveBeenCalledOnce();
    },
  );

  it("allows only one of two concurrent first writes, then supports a refreshed token", async () => {
    const h = databaseHarness();
    const first = saveWorkspaceProject("blank", "tab one", null);
    const second = saveWorkspaceProject("blank", "tab two", null);
    const secondFailed = expect(second).rejects.toMatchObject({ code: "conflict" });
    const firstTx = await h.open(0);
    const secondTx = await h.open(1);
    firstTx.deliverReads();
    firstTx.complete();
    expect(await first).toBe(1);
    secondTx.deliverReads();
    await secondFailed;
    expect(h.records.get("blank")).toEqual({ id: "blank", version: 1, payload: "tab one" });
    expect(secondTx.writes).toHaveLength(0);

    const refreshed = saveWorkspaceProject("blank", "resolved", 1);
    const thirdTx = await h.open(2);
    thirdTx.deliverReads();
    thirdTx.complete();
    expect(await refreshed).toBe(2);
    expect(h.records.get("blank")).toEqual({ id: "blank", version: 2, payload: "resolved" });
  });

  it("reports quota failure without replacing the previous record", async () => {
    const previous = { id: "blank", version: 1, payload: "previous" };
    const h = databaseHarness({ blank: previous });
    const pending = saveWorkspaceProject("blank", new Blob(["bytes"]), 1);
    const failed = expect(pending).rejects.toMatchObject({ code: "quota" });
    const tx = await h.open();
    tx.deliverReads();
    tx.writes[0].request.fail("QuotaExceededError");
    await failed;
    expect(h.records.get("blank")).toEqual(previous);
    expect(tx.aborted).toBe(true);
    expect(h.connections[0].close).toHaveBeenCalledOnce();
  });

  it.each([
    { id: "blank", version: 0, payload: {} },
    { id: "blank", version: 1.5, payload: {} },
    { id: "masseria", version: 1, payload: {} },
    { id: "blank", version: 1 },
    { id: "blank", version: 1, payload: {}, extra: true },
  ])("preserves malformed stored records instead of replacing them: %j", async (record) => {
    const h = databaseHarness({ blank: record });
    const pending = saveWorkspaceProject("blank", "new", null);
    const failed = expect(pending).rejects.toMatchObject({ code: "corrupt" });
    const tx = await h.open();
    tx.deliverReads();
    await failed;
    expect(tx.writes).toHaveLength(0);
    expect(h.records.get("blank")).toEqual(record);
  });

  it("rejects a malformed record during hydration without returning a partial workspace", async () => {
    const h = databaseHarness({
      masseria: { id: "masseria", version: 1, payload: "valid" },
      blank: { id: "blank", version: -1, payload: "invalid" },
    });
    const pending = loadWorkspace();
    const failed = expect(pending).rejects.toMatchObject({ code: "corrupt" });
    const tx = await h.open();
    tx.deliverReads();
    await failed;
    expect(tx.writes).toHaveLength(0);
    expect(h.records.size).toBe(2);
  });

  it.each([
    ["unknown", null],
    ["blank", 0],
    ["blank", Number.NaN],
    ["blank", -1],
  ] as const)("rejects an invalid slot/token %s/%s before opening storage", async (id, version) => {
    const h = databaseHarness();
    await expect(saveWorkspaceProject(id, {}, version)).rejects.toMatchObject({ code: "corrupt" });
    expect(h.factory.open).not.toHaveBeenCalled();
  });

  it("reports unavailable storage and schema versions without losing error classification", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(loadWorkspace()).rejects.toBeInstanceOf(WorkspaceStorageError);
    await expect(loadWorkspace()).rejects.toMatchObject({ code: "unavailable" });
    const h = databaseHarness();
    const pending = loadWorkspace();
    const failed = expect(pending).rejects.toMatchObject({ code: "corrupt" });
    h.openings[0].fail("VersionError");
    await failed;
  });

  it("bounds a blocked open and closes a connection delivered after rejection", async () => {
    const h = databaseHarness();
    const pending = loadWorkspace();
    const failed = expect(pending).rejects.toMatchObject({ code: "unavailable" });
    h.openings[0].onblocked?.();
    await failed;
    await h.open();
    expect(h.connections[0].close).toHaveBeenCalledOnce();
    expect(h.transactions).toHaveLength(0);
  });

  it("bounds an unresponsive open and aborts a delayed upgrade", async () => {
    vi.useFakeTimers();
    const h = databaseHarness();
    const pending = loadWorkspace();
    const failed = expect(pending).rejects.toMatchObject({ code: "unavailable" });
    await vi.advanceTimersByTimeAsync(5_001);
    await failed;
    h.openings[0].result = h.connections[0];
    const abort = vi.fn();
    h.openings[0].transaction = { abort };
    h.openings[0].onupgradeneeded?.();
    expect(abort).toHaveBeenCalledOnce();
    expect(h.connections[0].createObjectStore).not.toHaveBeenCalled();
    expect(h.connections[0].close).toHaveBeenCalledOnce();
  });

  it("aborts a stalled transaction and closes on a database version change", async () => {
    vi.useFakeTimers();
    const h = databaseHarness();
    const pending = saveWorkspaceProject("blank", {}, null);
    const failed = expect(pending).rejects.toMatchObject({ code: "unavailable" });
    const tx = await h.open();
    h.connections[0].onversionchange?.();
    expect(h.connections[0].close).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(10_001);
    await failed;
    expect(tx.aborted).toBe(true);
    expect(h.records.size).toBe(0);
  });
});

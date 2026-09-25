export type WorkspaceStorageErrorCode = "conflict" | "unavailable" | "quota" | "corrupt";

export class WorkspaceStorageError extends Error {
  constructor(
    readonly code: WorkspaceStorageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceStorageError";
  }
}

export interface SavedWorkspaceProject {
  readonly id: string;
  readonly version: number;
  readonly payload: unknown;
}

const projectIds = ["masseria", "rover", "creature", "blank"] as const;
const databaseName = "brikuma-workspace";
const databaseVersion = 1;
const storeName = "projects";
const openTimeout = 5_000;
const transactionTimeout = 10_000;

function storageError(error: unknown): WorkspaceStorageError {
  if (error instanceof WorkspaceStorageError) return error;
  const name = error && typeof error === "object" && "name" in error ? error.name : undefined;
  if (name === "QuotaExceededError")
    return new WorkspaceStorageError(
      "quota",
      "Browser storage is full. Your current work remains open, but could not be saved.",
    );
  if (name === "VersionError" || name === "DataCloneError" || name === "DataError")
    return new WorkspaceStorageError(
      "corrupt",
      "This saved workspace format could not be read or written. Existing saved work was not replaced.",
    );
  return new WorkspaceStorageError(
    "unavailable",
    "Browser storage is unavailable. Your current work remains open, but could not be saved.",
  );
}

function corrupt(): WorkspaceStorageError {
  return new WorkspaceStorageError(
    "corrupt",
    "The saved workspace record is invalid. Existing saved work was not replaced.",
  );
}

function savedProject(value: unknown, id: string): SavedWorkspaceProject | undefined {
  if (value === undefined) return undefined;
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("id" in value) ||
    value.id !== id ||
    !("version" in value) ||
    typeof value.version !== "number" ||
    !Number.isSafeInteger(value.version) ||
    value.version < 1 ||
    !("payload" in value) ||
    !Object.hasOwn(value, "payload") ||
    Object.keys(value).some((key) => !["id", "version", "payload"].includes(key))
  )
    throw corrupt();
  return { id, version: value.version, payload: value.payload };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let request: IDBOpenDBRequest;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(storageError(error));
    };
    const timeout = setTimeout(
      () => fail(new Error("Opening browser storage timed out.")),
      openTimeout,
    );
    try {
      if (typeof indexedDB === "undefined") throw new Error("IndexedDB is unavailable.");
      request = indexedDB.open(databaseName, databaseVersion);
      request.onblocked = () => fail(new Error("Another tab is blocking browser storage."));
      request.onerror = () => fail(request.error);
      request.onupgradeneeded = () => {
        if (settled) {
          request.transaction?.abort();
          request.result.close();
          return;
        }
        try {
          if (!request.result.objectStoreNames.contains(storeName))
            request.result.createObjectStore(storeName, { keyPath: "id" });
        } catch (error) {
          request.transaction?.abort();
          request.result.close();
          fail(error);
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        if (settled) {
          database.close();
          return;
        }
        settled = true;
        clearTimeout(timeout);
        database.onversionchange = () => database.close();
        resolve(database);
      };
    } catch (error) {
      fail(error);
    }
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, abort: (error: unknown) => void) => () => T,
): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    let settled = false;
    let transaction: IDBTransaction | undefined;
    let failure: WorkspaceStorageError | undefined;
    let result: (() => T) | undefined;
    function finish(error?: unknown) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      database.close();
      if (error) reject(storageError(error));
      else {
        try {
          if (!result) throw corrupt();
          resolve(result());
        } catch (error) {
          reject(storageError(error));
        }
      }
    }
    function abort(error: unknown) {
      failure = storageError(error);
      try {
        transaction?.abort();
      } catch {
        // A transaction can finish before its completion event is delivered.
      }
      finish(failure);
    }
    const timeout = setTimeout(
      () => abort(new Error("The browser storage transaction timed out.")),
      transactionTimeout,
    );
    try {
      if (!database.objectStoreNames.contains(storeName)) throw corrupt();
      transaction = database.transaction(storeName, mode);
      transaction.oncomplete = () => finish();
      transaction.onabort = () =>
        finish(failure ?? transaction?.error ?? new Error("Storage aborted."));
      transaction.onerror = () => {
        failure ??= storageError(transaction?.error);
      };
      const store = transaction.objectStore(storeName);
      if (store.keyPath !== "id") throw corrupt();
      result = run(store, abort);
    } catch (error) {
      abort(error);
    }
  });
}

/** Reads only known project slots. Opening or reading never writes project records. */
export function loadWorkspace(): Promise<SavedWorkspaceProject[]> {
  return withStore("readonly", (store, abort) => {
    const records = new Map<string, SavedWorkspaceProject>();
    for (const id of projectIds) {
      const request = store.get(id);
      request.onerror = () => abort(request.error);
      request.onsuccess = () => {
        try {
          const record = savedProject(request.result, id);
          if (record) records.set(id, record);
        } catch (error) {
          abort(error);
        }
      };
    }
    return () => projectIds.flatMap((id) => records.get(id) ?? []);
  });
}

/** Compare and write in one transaction; a request success is not a committed save. */
export function saveWorkspaceProject(
  id: string,
  payload: unknown,
  expectedVersion: number | null,
): Promise<number> {
  if (
    !projectIds.some((candidate) => candidate === id) ||
    (expectedVersion !== null && (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1))
  )
    return Promise.reject(corrupt());
  return withStore("readwrite", (store, abort) => {
    let nextVersion: number | undefined;
    const request = store.get(id);
    request.onerror = () => abort(request.error);
    request.onsuccess = () => {
      try {
        const current = savedProject(request.result, id);
        if ((current?.version ?? null) !== expectedVersion)
          throw new WorkspaceStorageError(
            "conflict",
            "Another tab saved this project. Download a backup of this tab, then reload to open the newer saved version. Neither copy has been overwritten.",
          );
        nextVersion = (current?.version ?? 0) + 1;
        if (!Number.isSafeInteger(nextVersion)) throw corrupt();
        const write = store.put({ id, version: nextVersion, payload });
        write.onerror = () => abort(write.error);
      } catch (error) {
        abort(error);
      }
    };
    return () => {
      if (nextVersion === undefined) throw corrupt();
      return nextVersion;
    };
  });
}

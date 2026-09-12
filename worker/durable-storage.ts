/**
 * Durable File-Backed Storage Engine for OmniScreenMesh.
 * Provides persistent, atomic JSON state storage with in-memory caching.
 */
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const STORAGE_FILE = path.join(DATA_DIR, "omnisign-storage.json");
const TMP_STORAGE_FILE = path.join(DATA_DIR, "omnisign-storage.json.tmp");

interface SerializedStorage {
  version: number;
  lastUpdated: number;
  partitions: Record<string, Record<string, unknown>>;
}

class DurableStorageEngine {
  private inMemoryData: Record<string, Record<string, unknown>> = {};
  private isLoaded = false;
  private writeTimer: NodeJS.Timeout | null = null;
  private isWriting = false;
  private pendingWrite = false;

  constructor() {
    this.hydrate();
  }

  private hydrate(): void {
    if (this.isLoaded) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
        const parsed: SerializedStorage = JSON.parse(raw);
        if (parsed && typeof parsed.partitions === "object") {
          this.inMemoryData = parsed.partitions;
        }
      }
      this.isLoaded = true;
    } catch (err) {
      console.warn("[DURABLE_STORAGE] Failed to hydrate from disk, initializing fresh partition store:", err);
      this.inMemoryData = {};
      this.isLoaded = true;
    }
  }

  public getPartition(partitionId: string): Record<string, unknown> {
    this.hydrate();
    if (!this.inMemoryData[partitionId]) {
      this.inMemoryData[partitionId] = {};
    }
    return this.inMemoryData[partitionId];
  }

  public setPartitionValue(partitionId: string, key: string, value: unknown): void {
    const partition = this.getPartition(partitionId);
    partition[key] = value;
    this.scheduleDiskSync();
  }

  public deletePartitionValue(partitionId: string, key: string): boolean {
    const partition = this.getPartition(partitionId);
    if (key in partition) {
      delete partition[key];
      this.scheduleDiskSync();
      return true;
    }
    return false;
  }

  public clearPartition(partitionId: string): void {
    this.hydrate();
    if (this.inMemoryData[partitionId]) {
      delete this.inMemoryData[partitionId];
      this.scheduleDiskSync();
    }
  }

  public clearAll(): void {
    this.inMemoryData = {};
    this.scheduleDiskSync();
  }

  public scheduleDiskSync(): void {
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => {
      this.flushToDisk();
    }, 25);
  }

  public flushToDisk(): void {
    if (this.isWriting) {
      this.pendingWrite = true;
      return;
    }

    this.isWriting = true;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      const payload: SerializedStorage = {
        version: 1,
        lastUpdated: Date.now(),
        partitions: this.inMemoryData,
      };

      const serialized = JSON.stringify(payload, null, 2);
      fs.writeFileSync(TMP_STORAGE_FILE, serialized, "utf-8");
      fs.renameSync(TMP_STORAGE_FILE, STORAGE_FILE);
    } catch (err) {
      console.error("[DURABLE_STORAGE] Error flushing state to disk:", err);
    } finally {
      this.isWriting = false;
      if (this.pendingWrite) {
        this.pendingWrite = false;
        this.flushToDisk();
      }
    }
  }
}

export const durableStorage = new DurableStorageEngine();

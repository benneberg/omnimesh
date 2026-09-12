/**
 * Core utilities for Multiple Entities sharing a single Durable Object class
 * DO NOT MODIFY THIS FILE - You may break the project functionality. STRICTLY DO NOT TOUCH
 * Look at the \`worker/entities.ts\` file for examples on how to use this library
 */
import type { ApiResponse } from "@shared/types";
import type { Context } from "hono";
import { durableStorage } from "./durable-storage";

export interface Env {
  GlobalDurableObject: {
    idFromName(name: string): string;
    get(id: string): GlobalDurableObject;
  };
}

type Doc<T> = { v: number; data: T };

export class GlobalDurableObject {
  private id: string;
  private data: Map<string, unknown>;

  constructor(id: string = "default") {
    this.id = id;
    const initial = durableStorage.getPartition(this.id);
    this.data = new Map(Object.entries(initial));
  }

  async del(key: string): Promise<boolean> {
    const existed = this.data.has(key);
    this.data.delete(key);
    durableStorage.deletePartitionValue(this.id, key);
    return existed;
  }

  async has(key: string): Promise<boolean> {
    return this.data.has(key);
  }

  async getDoc<T>(key: string): Promise<Doc<T> | null> {
    const v = this.data.get(key);
    return (v as Doc<T>) ?? null;
  }

  async casPut<T>(key: string, expectedV: number, data: T): Promise<{ ok: boolean; v: number }> {
    const cur = this.data.get(key) as Doc<T> | undefined;
    const curV = cur?.v ?? 0;
    if (curV !== expectedV) return { ok: false, v: curV };
    const nextV = curV + 1;
    const doc: Doc<T> = { v: nextV, data };
    this.data.set(key, doc);
    durableStorage.setPartitionValue(this.id, key, doc);
    return { ok: true, v: nextV };
  }

  async listPrefix(prefix: string, startAfter?: string | null, limit?: number) {
    const allKeys = Array.from(this.data.keys()).filter((k) => k.startsWith(prefix));
    allKeys.sort();
    let startIndex = 0;
    if (startAfter) {
      const idx = allKeys.indexOf(startAfter);
      if (idx !== -1) startIndex = idx + 1;
    }
    const sliced = limit != null ? allKeys.slice(startIndex, startIndex + limit) : allKeys.slice(startIndex);
    const next = limit != null && sliced.length === limit ? sliced[sliced.length - 1] : null;
    return { keys: sliced, next };
  }

  async indexAddBatch<T>(items: T[]): Promise<void> {
    for (const it of items) {
      const k = 'i:' + String(it);
      this.data.set(k, 1);
      durableStorage.setPartitionValue(this.id, k, 1);
    }
  }

  async indexRemoveBatch<T>(items: T[]): Promise<number> {
    let removed = 0;
    for (const it of items) {
      const k = 'i:' + String(it);
      if (this.data.has(k)) {
        this.data.delete(k);
        durableStorage.deletePartitionValue(this.id, k);
        removed++;
      }
    }
    return removed;
  }

  async indexDrop(_rootKey: string): Promise<void> {
    this.data.clear();
    durableStorage.clearPartition(this.id);
  }
}

const instances = new Map<string, GlobalDurableObject>();

export const defaultEnv: Env = {
  GlobalDurableObject: {
    idFromName: (name: string) => name,
    get: (id: string) => {
      let inst = instances.get(id);
      if (!inst) {
        inst = new GlobalDurableObject(id);
        instances.set(id, inst);
      }
      return inst;
    },
  },
};

export interface EntityStatics<S, T extends Entity<S>> {
  new (env: Env, id: string): T; // inherited default ctor
  readonly entityName: string;
  readonly initialState: S;
}

/**
 * Base class for entities - extend this class to create new entities
 */
export abstract class Entity<State> {
  protected _state!: State;
  protected _version: number = 0;
  protected readonly stub: GlobalDurableObject;
  protected readonly _id: string;
  protected readonly entityName: string;
  protected readonly env: Env;

  constructor(env: Env, id: string) {
    this.env = env || defaultEnv;
    this._id = id;

    // Read subclass statics via new.target / constructor
    const Ctor = this.constructor as EntityStatics<State, this>;
    this.entityName = Ctor.entityName;

    const instanceName = `${this.entityName}:${this._id}`;
    const doId = this.env.GlobalDurableObject.idFromName(instanceName);
    this.stub = this.env.GlobalDurableObject.get(doId);
  }

  /** Synchronous accessors */
  get id(): string {
    return this._id;
  }
  get state(): State {
    return this._state;
  }

  /** Storage key for this entity document. */
  protected key(): string {
    return `${this.entityName}:${this._id}`;
  }

  /** Save and refresh cache. */
  async save(next: State): Promise<void> {
    for (let i = 0; i < 4; i++) {
      await this.ensureState();
      const res = await this.stub.casPut(this.key(), this._version, next);
      if (res.ok) {
        this._version = res.v;
        this._state = next;
        return;
      }
      // retry on contention
    }
    throw new Error("Concurrent modification detected");
  }

  protected async ensureState(): Promise<State> {
    const Ctor = this.constructor as EntityStatics<State, this>;
    const doc = (await this.stub.getDoc(this.key())) as Doc<State> | null;
    if (doc == null) {
      this._version = 0;
      this._state = Ctor.initialState;
      return this._state;
    }
    this._version = doc.v;
    this._state = doc.data;
    return this._state;
  }

  async mutate(updater: (current: State) => State): Promise<State> {
    // Small bounded retry loop for CAS contention
    for (let i = 0; i < 4; i++) {
      const current = await this.ensureState();
      const startV = this._version;
      const next = updater(current);
      const res = await this.stub.casPut(this.key(), startV, next);
      if (res.ok) {
        this._version = res.v;
        this._state = next;
        return next;
      }
      // someone else updated; retry
    }
    throw new Error("Concurrent modification detected");
  }

  async getState(): Promise<State> {
    return this.ensureState();
  }

  async patch(p: Partial<State>): Promise<void> {
    await this.mutate((s) => ({ ...s, ...p }));
  }

  async exists(): Promise<boolean> {
    return this.stub.has(this.key());
  }

  /** Delete the entity. */
  async delete(): Promise<boolean> {
    const ok = await this.stub.del(this.key());
    if (ok) {
      const Ctor = this.constructor as EntityStatics<State, this>;
      this._version = 0;
      this._state = Ctor.initialState;
    }
    return ok;
  }
}

// Minimal prefix-based index held in its own DO instance.
export class Index<T extends string> extends Entity<unknown> {
  static readonly entityName = "sys-index-root";

  constructor(env: Env, name: string) { super(env || defaultEnv, `index:${name}`); }

  /**
   * Adds a batch of items to the index transactionally.
   */
  async addBatch(itemsToAdd: T[]): Promise<void> {
    if (itemsToAdd.length === 0) return;
    await this.stub.indexAddBatch(itemsToAdd);
  }

  async add(item: T): Promise<void> {
    return this.addBatch([item]);
  }

  async remove(item: T): Promise<boolean> {
    const removed = await this.removeBatch([item]);
    return removed > 0;
  }

  async removeBatch(itemsToRemove: T[]): Promise<number> {
    if (itemsToRemove.length === 0) return 0;
    return this.stub.indexRemoveBatch(itemsToRemove);
  }

  async clear(): Promise<void> { await this.stub.indexDrop(this.key()); }

  async page(cursor?: string | null, limit?: number): Promise<{ items: T[]; next: string | null }> {
    const { keys, next } = await this.stub.listPrefix('i:', cursor ?? null, limit);
    return { items: keys.map(k => k.slice(2) as T), next };
  }

  async list(): Promise<T[]> {
    const { keys } = await this.stub.listPrefix('i:');
    return keys.map(k => k.slice(2) as T);
  }
}

type IS<T> = T extends new (env: Env, id: string) => IndexedEntity<infer S> ? S : never;
type HS<TCtor> = TCtor & { indexName: string; keyOf(state: IS<TCtor>): string; seedData?: ReadonlyArray<IS<TCtor>> };
type CtorAny = new (env: Env, id: string) => IndexedEntity<{ id: string }>;

export abstract class IndexedEntity<S extends { id: string }> extends Entity<S> {
  static readonly indexName: string;
  static keyOf<U extends { id: string }>(state: U): string { return state.id; }

  // Static helpers infer S from `this` and the arguments
  static async create<TCtor extends CtorAny>(this: HS<TCtor>, env: Env, state: IS<TCtor>): Promise<IS<TCtor>> {
    env = env || defaultEnv;
    const id = this.keyOf(state);
    const inst = new this(env, id);
    await inst.save(state);
    const idx = new Index<string>(env, this.indexName);
    await idx.add(id);
    return state;
  }

  static async list<TCtor extends CtorAny>(
    this: HS<TCtor>,
    env: Env,
    cursor?: string | null,
    limit?: number
  ): Promise<{ items: IS<TCtor>[]; next: string | null }> {
    env = env || defaultEnv;
    const idx = new Index<string>(env, this.indexName);
    const { items: ids, next } = await idx.page(cursor, limit);
    const rows = (await Promise.all(ids.map((id) => new this(env, id).getState()))) as IS<TCtor>[];
    return { items: rows, next };
  }

  static async ensureSeed<TCtor extends CtorAny>(this: HS<TCtor>, env: Env): Promise<void> {
    env = env || defaultEnv;
    const idx = new Index<string>(env, this.indexName);
    const ids = await idx.list();
    const seeds = this.seedData;
    if (ids.length === 0 && seeds && seeds.length > 0) {
      await Promise.all(seeds.map(s => new this(env, this.keyOf(s)).save(s)));
      await idx.addBatch(seeds.map(s => this.keyOf(s)));
    }
  }

  /** Delete an entity document and remove its id from the index. */
  static async delete<TCtor extends CtorAny>(this: HS<TCtor>, env: Env, id: string): Promise<boolean> {
    env = env || defaultEnv;
    const inst = new this(env, id);
    const existed = await inst.delete();
    const idx = new Index<string>(env, this.indexName);
    await idx.remove(id);
    return existed;
  }

  /** Delete many entities and prune their ids from the index. Returns number of docs removed. */
  static async deleteMany<TCtor extends CtorAny>(this: HS<TCtor>, env: Env, ids: string[]): Promise<number> {
    env = env || defaultEnv;
    if (ids.length === 0) return 0;
    const results = await Promise.all(ids.map(async (id) => new this(env, id).delete()));
    const idx = new Index<string>(env, this.indexName);
    await idx.removeBatch(ids);
    return results.filter(Boolean).length;
  }

  /** Remove only the id from the index; does not delete the entity document. */
  static async removeFromIndex<TCtor extends CtorAny>(this: HS<TCtor>, env: Env, id: string): Promise<void> {
    env = env || defaultEnv;
    const idx = new Index<string>(env, this.indexName);
    await idx.remove(id);
  }

  protected override async ensureState(): Promise<S> {
    const s = (await super.ensureState()) as S;
    if (!s.id) {
      // Ensure the entity state id matches the instance id for consistency
      const withId = { ...s, id: this.id } as S;
      this._state = withId;
      return withId;
    }
    return s;
  }
}

// API HELPERS

export const ok = <T>(c: Context, data: T) => c.json({ success: true, data } as ApiResponse<T>);
export const bad = (c: Context, error: string) => c.json({ success: false, error } as ApiResponse, 400);
export const notFound = (c: Context, error = 'not found') => c.json({ success: false, error } as ApiResponse, 404);
export const isStr = (s: unknown): s is string => typeof s === 'string' && s.length > 0;
import { promises as fs } from "fs";
import path from "path";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { nanoid } from "nanoid";
import type { CreateStoreInput, Store } from "./types";
import { slugify } from "./slug";
import { normalizeGoogleMapsInput } from "./google";

const IS_VERCEL = Boolean(process.env.VERCEL);
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "stores.json");

type DbShape = { stores: Store[] };
type StoreRow = {
  id: string;
  name: string;
  slug: string;
  place_id: string;
  address: string | null;
  scan_count: number;
  created_at: Date | string;
  updated_at: Date | string;
};

let databaseClient: NeonQueryFunction<false, false> | undefined;
let schemaReady: Promise<void> | undefined;

async function getDatabase(): Promise<NeonQueryFunction<false, false> | null> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    if (IS_VERCEL) {
      throw new Error("DATABASE_URL must be configured for production storage.");
    }
    return null;
  }

  if (!databaseClient) databaseClient = neon(connectionString);
  if (!schemaReady) {
    schemaReady = databaseClient`
      CREATE TABLE IF NOT EXISTS stores (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL CONSTRAINT stores_slug_unique UNIQUE,
        place_id TEXT NOT NULL,
        address TEXT,
        scan_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `
      .then(() => undefined)
      .catch((error: unknown) => {
        schemaReady = undefined;
        throw error;
      });
  }
  await schemaReady;
  return databaseClient;
}

function toStore(row: StoreRow): Store {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    placeId: row.place_id,
    address: row.address ?? undefined,
    scanCount: Number(row.scan_count),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function ensureDb(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify({ stores: [] }, null, 2), "utf8");
  }
}

async function readDb(): Promise<DbShape> {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(raw) as DbShape;
}

async function writeDb(db: DbShape): Promise<void> {
  await ensureDb();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function uniqueSlug(desired: string, stores: Store[], excludeId?: string): string {
  const base = slugify(desired) || "store";
  let candidate = base;
  let i = 2;
  while (stores.some((s) => s.slug === candidate && s.id !== excludeId)) {
    candidate = `${base}-${i}`;
    i += 1;
  }
  return candidate;
}

function isSlugConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505" &&
    "constraint" in error &&
    error.constraint === "stores_slug_unique"
  );
}

export async function listStores(): Promise<Store[]> {
  const database = await getDatabase();
  if (database) {
    const rows = await database`SELECT * FROM stores ORDER BY created_at DESC`;
    return rows.map((row) => toStore(row as StoreRow));
  }

  const db = await readDb();
  return [...db.stores].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getStoreById(id: string): Promise<Store | null> {
  const database = await getDatabase();
  if (database) {
    const rows = await database`SELECT * FROM stores WHERE id = ${id} LIMIT 1`;
    return rows[0] ? toStore(rows[0] as StoreRow) : null;
  }

  const db = await readDb();
  return db.stores.find((s) => s.id === id) ?? null;
}

export async function getStoreBySlug(slug: string): Promise<Store | null> {
  const database = await getDatabase();
  if (database) {
    const rows = await database`SELECT * FROM stores WHERE slug = ${slug} LIMIT 1`;
    return rows[0] ? toStore(rows[0] as StoreRow) : null;
  }

  const db = await readDb();
  return db.stores.find((s) => s.slug === slug) ?? null;
}

export async function createStore(input: CreateStoreInput): Promise<Store> {
  const name = input.name.trim();
  const placeId = normalizeGoogleMapsInput(input.placeId);

  if (!name) throw new Error("Store name is required");

  const database = await getDatabase();
  if (database) {
    const now = new Date().toISOString();
    const baseSlug = slugify(input.slug || name) || "store";
    let slug = baseSlug;
    let suffix = 2;

    while (true) {
      const rows = await database`
        INSERT INTO stores (
          id, name, slug, place_id, address, scan_count, created_at, updated_at
        )
        VALUES (
          ${nanoid(12)}, ${name}, ${slug}, ${placeId},
          ${input.address?.trim() || null}, 0, ${now}, ${now}
        )
        ON CONFLICT (slug) DO NOTHING
        RETURNING *
      `;
      if (rows[0]) return toStore(rows[0] as StoreRow);
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  const db = await readDb();
  const now = new Date().toISOString();
  const store: Store = {
    id: nanoid(12),
    name,
    slug: uniqueSlug(input.slug || name, db.stores),
    placeId,
    address: input.address?.trim() || undefined,
    scanCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  db.stores.push(store);
  await writeDb(db);
  return store;
}

export async function updateStore(
  id: string,
  patch: Partial<CreateStoreInput>,
): Promise<Store> {
  const database = await getDatabase();
  if (database) {
    const currentRows = await database`SELECT * FROM stores WHERE id = ${id} LIMIT 1`;
    if (!currentRows[0]) throw new Error("Store not found");
    const current = toStore(currentRows[0] as StoreRow);
    const name = patch.name?.trim() ?? current.name;
    const placeId =
      patch.placeId !== undefined
        ? normalizeGoogleMapsInput(patch.placeId)
        : current.placeId;

    if (!name) throw new Error("Store name is required");
    const address =
      patch.address !== undefined
        ? patch.address.trim() || null
        : current.address ?? null;
    const baseSlug = patch.slug
      ? slugify(patch.slug) || "store"
      : current.slug;
    let slug = baseSlug;
    let suffix = 2;

    while (true) {
      const conflicts = await database`
        SELECT id FROM stores WHERE slug = ${slug} AND id <> ${id} LIMIT 1
      `;
      if (conflicts.length > 0) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
        continue;
      }

      try {
        const rows = await database`
          UPDATE stores
          SET name = ${name},
              slug = ${slug},
              place_id = ${placeId},
              address = ${address},
              updated_at = ${new Date().toISOString()}
          WHERE id = ${id}
          RETURNING *
        `;
        if (!rows[0]) throw new Error("Store not found");
        return toStore(rows[0] as StoreRow);
      } catch (error) {
        if (!isSlugConflict(error)) throw error;
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }
    }
  }

  const db = await readDb();
  const index = db.stores.findIndex((s) => s.id === id);
  if (index === -1) throw new Error("Store not found");

  const current = db.stores[index];
  const name = patch.name?.trim() ?? current.name;
  const placeId =
    patch.placeId !== undefined
      ? normalizeGoogleMapsInput(patch.placeId)
      : current.placeId;

  if (!name) throw new Error("Store name is required");
  const updated: Store = {
    ...current,
    name,
    placeId,
    address:
      patch.address !== undefined
        ? patch.address.trim() || undefined
        : current.address,
    slug: patch.slug
      ? uniqueSlug(patch.slug, db.stores, id)
      : current.slug,
    updatedAt: new Date().toISOString(),
  };

  db.stores[index] = updated;
  await writeDb(db);
  return updated;
}

export async function deleteStore(id: string): Promise<void> {
  const database = await getDatabase();
  if (database) {
    const rows = await database`DELETE FROM stores WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) throw new Error("Store not found");
    return;
  }

  const db = await readDb();
  const next = db.stores.filter((s) => s.id !== id);
  if (next.length === db.stores.length) throw new Error("Store not found");
  db.stores = next;
  await writeDb(db);
}

export async function recordScan(slug: string): Promise<Store | null> {
  const database = await getDatabase();
  if (database) {
    const rows = await database`
      UPDATE stores
      SET scan_count = scan_count + 1, updated_at = ${new Date().toISOString()}
      WHERE slug = ${slug}
      RETURNING *
    `;
    return rows[0] ? toStore(rows[0] as StoreRow) : null;
  }

  const db = await readDb();
  const index = db.stores.findIndex((s) => s.slug === slug);
  if (index === -1) return null;

  db.stores[index] = {
    ...db.stores[index],
    scanCount: db.stores[index].scanCount + 1,
    updatedAt: new Date().toISOString(),
  };
  await writeDb(db);
  return db.stores[index];
}

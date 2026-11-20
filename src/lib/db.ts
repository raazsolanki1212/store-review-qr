import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import type { CreateStoreInput, Store } from "./types";
import { slugify } from "./slug";
import { normalizeGoogleMapsInput } from "./google";

const IS_VERCEL = Boolean(process.env.VERCEL);
const DATA_DIR = IS_VERCEL
  ? path.join("/tmp", "store-review-qr")
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "stores.json");
const BUNDLED_DB_PATH = path.join(process.cwd(), "data", "stores.json");

type DbShape = { stores: Store[] };

async function ensureDb(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    let initial: DbShape = { stores: [] };
    if (IS_VERCEL) {
      try {
        const bundled = await fs.readFile(BUNDLED_DB_PATH, "utf8");
        initial = JSON.parse(bundled) as DbShape;
      } catch {
        initial = { stores: [] };
      }
    }
    await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
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

export async function listStores(): Promise<Store[]> {
  const db = await readDb();
  return [...db.stores].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getStoreById(id: string): Promise<Store | null> {
  const db = await readDb();
  return db.stores.find((s) => s.id === id) ?? null;
}

export async function getStoreBySlug(slug: string): Promise<Store | null> {
  const db = await readDb();
  return db.stores.find((s) => s.slug === slug) ?? null;
}

export async function createStore(input: CreateStoreInput): Promise<Store> {
  const name = input.name.trim();
  const placeId = normalizeGoogleMapsInput(input.placeId);

  if (!name) throw new Error("Store name is required");
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
  const db = await readDb();
  const next = db.stores.filter((s) => s.id !== id);
  if (next.length === db.stores.length) throw new Error("Store not found");
  db.stores = next;
  await writeDb(db);
}

export async function recordScan(slug: string): Promise<Store | null> {
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

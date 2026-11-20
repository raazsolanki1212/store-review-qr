import { scryptSync, randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());

const connectionString = process.env.DATABASE_URL?.trim();
const id = process.env.ADMIN_ID?.trim();
const password = process.env.ADMIN_PASSWORD;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the admin account.");
}
if (!id || !password || password.length < 12) {
  throw new Error("Set ADMIN_ID and an ADMIN_PASSWORD of at least 12 characters.");
}

const salt = randomBytes(16).toString("base64url");
const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString("base64url")}`;
const sql = neon(connectionString);

await sql`
  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  )
`;
await sql`
  INSERT INTO admin_users (id, password_hash, updated_at)
  VALUES (${id}, ${passwordHash}, ${new Date().toISOString()})
  ON CONFLICT (id)
  DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = EXCLUDED.updated_at
`;

console.log(`Seeded admin account "${id}".`);

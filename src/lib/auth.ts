import { createHmac, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

const COOKIE_NAME = "reviewqr_admin_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const scryptAsync = promisify(scrypt);

let databaseClient: NeonQueryFunction<false, false> | undefined;
let schemaReady: Promise<void> | undefined;

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  }
  return secret;
}

async function getAdminDatabase(): Promise<NeonQueryFunction<false, false> | null> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) return null;

  if (!databaseClient) databaseClient = neon(connectionString);
  if (!schemaReady) {
    schemaReady = databaseClient`
      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
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

async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [salt, encodedHash] = passwordHash.split(":");
  if (!salt || !encodedHash) return false;

  const expected = Buffer.from(encodedHash, "base64url");
  if (expected.length !== 64) return false;
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;
  return timingSafeEqual(actual, expected);
}

export async function verifyAdminCredentials(
  id: string,
  password: string,
): Promise<boolean> {
  const database = await getAdminDatabase();
  if (database) {
    const rows = await database`
      SELECT password_hash FROM admin_users WHERE id = ${id} LIMIT 1
    `;
    return rows[0]
      ? verifyPassword(password, String(rows[0].password_hash))
      : false;
  }

  const configuredId = process.env.ADMIN_ID;
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredId || !configuredPassword) return false;

  const candidateId = Buffer.from(id);
  const expectedId = Buffer.from(configuredId);
  const candidatePassword = Buffer.from(password);
  const expectedPassword = Buffer.from(configuredPassword);

  return (
    candidateId.length === expectedId.length &&
    candidatePassword.length === expectedPassword.length &&
    timingSafeEqual(candidateId, expectedId) &&
    timingSafeEqual(candidatePassword, expectedPassword)
  );
}

export function createSessionToken(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const value = String(expiresAt);
  const signature = createHmac("sha256", getAuthSecret())
    .update(value)
    .digest("base64url");
  return `${value}.${signature}`;
}

function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [expiresAt, signature, extra] = token.split(".");
  if (!expiresAt || !signature || extra !== undefined) return false;

  const expiresAtSeconds = Number(expiresAt);
  if (
    !Number.isSafeInteger(expiresAtSeconds) ||
    expiresAtSeconds <= Math.floor(Date.now() / 1000)
  ) {
    return false;
  }

  const expectedSignature = createHmac("sha256", getAuthSecret())
    .update(expiresAt)
    .digest();
  const providedSignature = Buffer.from(signature, "base64url");
  return (
    expectedSignature.length === providedSignature.length &&
    timingSafeEqual(expectedSignature, providedSignature)
  );
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    return isValidSessionToken(cookieStore.get(COOKIE_NAME)?.value);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("AUTH_SECRET")) {
      return false;
    }
    throw error;
  }
}

export async function requireAdmin(): Promise<NextResponse | null> {
  if (await isAdminAuthenticated()) return null;
  return NextResponse.json({ error: "Authentication required." }, { status: 401 });
}

export const adminSessionCookie = {
  name: COOKIE_NAME,
  maxAge: SESSION_TTL_SECONDS,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

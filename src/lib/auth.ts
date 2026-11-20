import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "reviewqr_admin_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type AdminCredential = { id: string; password: string };

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function validateAdminCredential(value: unknown): AdminCredential {
  if (
    !value ||
    typeof value !== "object" ||
    !("id" in value) ||
    !("password" in value) ||
    typeof value.id !== "string" ||
    typeof value.password !== "string"
  ) {
    throw new Error("Each ADMIN_CREDENTIALS entry must include an ID and password.");
  }

  const id = value.id.trim();
  const password = value.password;
  if (!id || id.length > 256 || password.length < 12 || password.length > 1024) {
    throw new Error(
      "Admin IDs must be 1–256 characters and passwords must be 12–1024 characters.",
    );
  }

  return { id, password };
}

function getAdminCredentials(): AdminCredential[] {
  const configuredCredentials = process.env.ADMIN_CREDENTIALS?.trim();
  if (configuredCredentials) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(configuredCredentials);
    } catch {
      throw new Error("ADMIN_CREDENTIALS must be a valid JSON array.");
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("ADMIN_CREDENTIALS must contain at least one account.");
    }
    return parsed.map(validateAdminCredential);
  }

  const id = process.env.ADMIN_ID?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (id && password) return [validateAdminCredential({ id, password })];
  if (id || password) {
    throw new Error("Set both ADMIN_ID and ADMIN_PASSWORD, or use ADMIN_CREDENTIALS.");
  }
  throw new Error("Set ADMIN_ID and ADMIN_PASSWORD or configure ADMIN_CREDENTIALS.");
}

function constantTimeEquals(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  );
}

export async function verifyAdminCredentials(
  id: string,
  password: string,
): Promise<boolean> {
  const credentials = getAdminCredentials();
  return credentials.some(
    (credential) =>
      constantTimeEquals(id, credential.id) &&
      constantTimeEquals(password, credential.password),
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

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  adminSessionCookie,
  createSessionToken,
  verifyAdminCredentials,
} from "@/lib/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const id = typeof input.id === "string" ? input.id.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!id || !password || id.length > 256 || password.length > 1024) {
    return NextResponse.json({ error: "Enter a valid ID and password." }, { status: 400 });
  }

  try {
    if (!(await verifyAdminCredentials(id, password))) {
      return NextResponse.json({ error: "Invalid ID or password." }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set(adminSessionCookie.name, createSessionToken(), adminSessionCookie);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin login failed:", error);
    return NextResponse.json({ error: "Authentication is not configured correctly." }, { status: 500 });
  }
}

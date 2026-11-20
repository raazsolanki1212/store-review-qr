import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminSessionCookie } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(adminSessionCookie.name);
  return NextResponse.json({ ok: true });
}

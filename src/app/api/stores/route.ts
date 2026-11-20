import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createStore, listStores } from "@/lib/db";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const stores = await listStores();
  return NextResponse.json({ stores });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const store = await createStore({
      name: String(body.name ?? ""),
      placeId: String(body.placeId ?? ""),
      address: body.address ? String(body.address) : undefined,
      placeCategory: body.placeCategory ? String(body.placeCategory) : undefined,
      slug: body.slug ? String(body.slug) : undefined,
    });
    return NextResponse.json({ store }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create store";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

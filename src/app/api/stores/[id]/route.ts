import { NextResponse } from "next/server";
import { deleteStore, getStoreById, updateStore } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const store = await getStoreById(id);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }
  return NextResponse.json({ store });
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const store = await updateStore(id, {
      name: body.name !== undefined ? String(body.name) : undefined,
      placeId: body.placeId !== undefined ? String(body.placeId) : undefined,
      address: body.address !== undefined ? String(body.address) : undefined,
      slug: body.slug !== undefined ? String(body.slug) : undefined,
    });
    return NextResponse.json({ store });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update store";
    const status = message === "Store not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await deleteStore(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete store";
    const status = message === "Store not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

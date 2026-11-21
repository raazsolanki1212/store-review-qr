import { NextResponse } from "next/server";
import { recordScan } from "@/lib/db";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const store = await recordScan(slug);

  if (!store) {
    return new NextResponse("This store QR code is no longer active.", {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.redirect(
    new URL(`/review/${encodeURIComponent(store.slug)}`, request.url),
    { status: 302 },
  );
}

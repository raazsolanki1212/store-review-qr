import { NextResponse } from "next/server";
import { getStoreById } from "@/lib/db";
import { generateQrPngBuffer } from "@/lib/qr";
import { getReviewShortUrl } from "@/lib/urls";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const store = await getStoreById(id);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "png";
  const shortUrl = getReviewShortUrl(store.slug);

  if (format === "json") {
    const { generateQrDataUrl } = await import("@/lib/qr");
    const dataUrl = await generateQrDataUrl(shortUrl);
    return NextResponse.json({ url: shortUrl, dataUrl });
  }

  const buffer = await generateQrPngBuffer(shortUrl);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${store.slug}-review-qr.png"`,
      "Cache-Control": "no-store",
    },
  });
}

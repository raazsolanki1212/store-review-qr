import { NextResponse } from "next/server";
import { recordScan } from "@/lib/db";
import { buildGoogleReviewUrl } from "@/lib/google";

type Params = { params: Promise<{ slug: string }> };

/**
 * Public QR landing: count the scan, then send the customer to Google's
 * official write-a-review page. Reviews are submitted by the customer in Google.
 */
export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const store = await recordScan(slug);

  if (!store) {
    return NextResponse.redirect(new URL("/?error=store-not-found", getOrigin(_request)));
  }

  return NextResponse.redirect(buildGoogleReviewUrl(store.placeId), {
    status: 302,
  });
}

function getOrigin(request: Request): string {
  const url = new URL(request.url);
  return url.origin;
}

import { NextResponse } from "next/server";
import { getStoreBySlug } from "@/lib/db";
import {
  generateReviewDraft,
  getAvailableReviewProviders,
} from "@/lib/review-ai";
import {
  REVIEW_CATEGORIES,
  type ReviewProvider,
} from "@/lib/review-types";

const MAX_CATEGORIES = 5;

export const maxDuration = 60;

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
  const slug = typeof input.slug === "string" ? input.slug.trim() : "";
  const categories = input.categories;

  if (!slug || slug.length > 100) {
    return NextResponse.json({ error: "A valid store is required." }, { status: 400 });
  }

  if (
    !Array.isArray(categories) ||
    categories.length === 0 ||
    categories.length > MAX_CATEGORIES ||
    !categories.every(
      (category) =>
        typeof category === "string" &&
        REVIEW_CATEGORIES.some((item) => item.id === category),
    )
  ) {
    return NextResponse.json(
      { error: "Choose between 1 and 5 review topics." },
      { status: 400 },
    );
  }

  const store = await getStoreBySlug(slug);
  if (!store) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const providers = getAvailableReviewProviders();
  if (providers.length === 0) {
    return NextResponse.json(
      { error: "AI drafting is not configured." },
      { status: 503 },
    );
  }

  let lastError: unknown;
  for (const provider of providers as ReviewProvider[]) {
    try {
      const draft = await generateReviewDraft({
        provider,
        storeName: store.name,
        placeCategory: store.placeCategory,
        categories: categories as string[],
      });
      return NextResponse.json({ draft });
    } catch (error) {
      lastError = error;
    }
  }

  if (
    lastError instanceof Error &&
    (lastError.name === "TimeoutError" || lastError.name === "AbortError")
  ) {
    return NextResponse.json(
      { error: "The configured AI model took too long to respond. Please retry." },
      { status: 504 },
    );
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "Could not generate a review draft.";
  const status = message.includes("API key is not configured") ? 503 : 502;
  return NextResponse.json({ error: message }, { status });
}

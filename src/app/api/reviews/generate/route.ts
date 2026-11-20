import { NextResponse } from "next/server";
import { getStoreBySlug } from "@/lib/db";
import { generateReviewDraft } from "@/lib/review-ai";
import {
  isReviewProvider,
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
    !isReviewProvider(input.provider) ||
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
      { error: "Choose an AI provider and between 1 and 5 review topics." },
      { status: 400 },
    );
  }

  const store = await getStoreBySlug(slug);
  if (!store) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  try {
    const draft = await generateReviewDraft({
      provider: input.provider as ReviewProvider,
      storeName: store.name,
      categories: categories as string[],
    });
    return NextResponse.json({ draft });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      return NextResponse.json(
        {
          error:
            "The AI provider took too long to respond. Please retry or choose another provider.",
        },
        { status: 504 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Could not generate a review draft.";
    const status = message.includes("API key is not configured") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

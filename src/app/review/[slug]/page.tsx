import { notFound } from "next/navigation";
import { ReviewGenerator } from "@/components/ReviewGenerator";
import { getStoreBySlug } from "@/lib/db";
import { buildGoogleReviewUrl } from "@/lib/google";
import { getAvailableReviewProviders } from "@/lib/review-ai";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function ReviewPage({ params }: Props) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);

  if (!store) notFound();

  return (
    <main className="review-shell">
      <header className="review-header">
        <span className="pill">Your experience, your words</span>
        <h1 className="brand">Review {store.name}</h1>
        <p className="tagline">
          Select the topics that stood out during your visit. AI will turn them
          into a natural review draft for you to review and edit.
        </p>
      </header>
      <ReviewGenerator
        slug={store.slug}
        storeName={store.name}
        providers={getAvailableReviewProviders()}
        reviewUrl={buildGoogleReviewUrl(store.placeId)}
      />
      <p className="foot-note">
        Only share a review that reflects your genuine experience. The draft is
        not submitted automatically; you decide what to copy, edit, and post.
      </p>
    </main>
  );
}

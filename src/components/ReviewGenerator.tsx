"use client";

import { FormEvent, useState } from "react";
import { REVIEW_CATEGORIES, type ReviewProvider } from "@/lib/review-types";

type Props = {
  slug: string;
  storeName: string;
  providers: ReviewProvider[];
  reviewUrl: string;
};

export function ReviewGenerator({ slug, storeName, providers, reviewUrl }: Props) {
  const [categories, setCategories] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  function toggleCategory(category: string) {
    setCategories((selected) =>
      selected.includes(category)
        ? selected.filter((item) => item !== category)
        : [...selected, category],
    );
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCopied(false);
    setLoading(true);

    try {
      const response = await fetch("/api/reviews/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, categories }),
      });
      const data: unknown = await response.json();
      if (!data || typeof data !== "object") {
        throw new Error("The review service returned an invalid response.");
      }

      const result = data as { draft?: unknown; error?: unknown };
      if (!response.ok) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Could not generate a review draft.",
        );
      }
      if (typeof result.draft !== "string" || !result.draft.trim()) {
        throw new Error("The AI provider returned an empty draft. Please try again.");
      }

      setDraft(result.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a review draft.");
    } finally {
      setLoading(false);
    }
  }

  async function copyDraft() {
    setError(null);
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
    } catch {
      setError("Could not copy the draft. Select and copy the text instead.");
    }
  }

  return (
    <section className="panel review-panel" aria-label={`Review ${storeName}`}>
      {providers.length === 0 ? (
        <div className="panel-header">
          <h2>AI drafting is not configured</h2>
          <p>
            The store owner needs to configure an OpenAI, Google Gemini, or Groq API key
            before drafts can be generated.
          </p>
        </div>
      ) : (
        <>
          <form className="stack-form" onSubmit={handleGenerate}>
            <fieldset className="category-field">
              <legend>What stood out? Select up to 5 topics.</legend>
              <div className="category-grid">
                {REVIEW_CATEGORIES.map((category) => (
                  <label className="category-option" key={category.id}>
                    <input
                      type="checkbox"
                      checked={categories.includes(category.id)}
                      disabled={
                        !categories.includes(category.id) && categories.length >= 5
                      }
                      onChange={() => toggleCategory(category.id)}
                    />
                    <span>{category.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {error ? <p className="error" role="alert">{error}</p> : null}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || categories.length === 0}
            >
              {loading ? "Generating…" : "Generate review draft"}
            </button>
          </form>

          {draft ? (
            <div className="draft-result">
              <div className="field">
                <label htmlFor="review-draft">Your editable draft</label>
                <textarea
                  id="review-draft"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={6}
                />
              </div>
              <div className="review-actions">
                <button type="button" className="btn-ghost" onClick={copyDraft}>
                  {copied ? "Copied" : "Copy draft"}
                </button>
                <a
                  className="btn-primary"
                  href={reviewUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Continue to Google reviews
                </a>
              </div>
              <p className="hint">
                Check and edit the draft so it accurately reflects your experience
                before sharing it on Google.
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

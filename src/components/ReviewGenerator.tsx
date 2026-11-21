"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  slug: string;
  storeName: string;
  aiConfigured: boolean;
  reviewUrl: string;
};

export function ReviewGenerator({ slug, storeName, aiConfigured, reviewUrl }: Props) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(aiConfigured);
  const [copied, setCopied] = useState(false);
  const requestedSlug = useRef<string | null>(null);

  const generateDraft = useCallback(async () => {
    setError(null);
    setCopied(false);
    setDraft("");
    setLoading(true);

    try {
      const response = await fetch("/api/reviews/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
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
  }, [slug]);

  useEffect(() => {
    if (!aiConfigured || requestedSlug.current === slug) return;
    requestedSlug.current = slug;
    void generateDraft();
  }, [aiConfigured, generateDraft, slug]);

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
      {!aiConfigured ? (
        <div className="panel-header">
          <h2>AI drafting is not configured</h2>
          <p>
            The store owner needs to configure an OpenAI, Google Gemini, or Groq API key
            before drafts can be generated.
          </p>
        </div>
      ) : (
        <>
          {loading && !draft ? (
            <p className="hint" aria-live="polite">
              Creating your review draft…
            </p>
          ) : null}
          {error ? (
            <div className="stack-form">
              <p className="error" role="alert">{error}</p>
              {!draft ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void generateDraft()}
                  disabled={loading}
                >
                  {loading ? "Generating…" : "Try again"}
                </button>
              ) : null}
            </div>
          ) : null}
          {draft ? (
            <div className="draft-result">
              <div className="field">
                <label htmlFor="review-draft">Your editable review draft</label>
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
                Add your real experience and edit anything that does not reflect
                your visit before sharing it on Google.
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

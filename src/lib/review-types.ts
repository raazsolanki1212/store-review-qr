export const REVIEW_PROVIDERS = {
  openai: "OpenAI",
  gemini: "Google Gemini",
  groq: "Groq",
} as const;

export type ReviewProvider = keyof typeof REVIEW_PROVIDERS;

export function isReviewProvider(value: unknown): value is ReviewProvider {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(REVIEW_PROVIDERS, value)
  );
}

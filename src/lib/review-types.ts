export const REVIEW_CATEGORIES = [
  { id: "service", label: "Service" },
  { id: "quality", label: "Food or product quality" },
  { id: "atmosphere", label: "Atmosphere" },
  { id: "value", label: "Value" },
  { id: "cleanliness", label: "Cleanliness" },
  { id: "speed", label: "Speed" },
  { id: "accessibility", label: "Accessibility" },
] as const;

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

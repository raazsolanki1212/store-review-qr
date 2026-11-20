import "server-only";
import {
  REVIEW_CATEGORIES,
  type ReviewProvider,
} from "@/lib/review-types";

const AI_REQUEST_TIMEOUT_MS = 55_000;
const GEMINI_RETRY_DELAYS_MS = [700, 1_500] as const;

type ReviewDraftInput = {
  provider: ReviewProvider;
  storeName: string;
  placeCategory?: string;
  categories: string[];
};

export function getAvailableReviewProviders(): ReviewProvider[] {
  const providers: ReviewProvider[] = [];
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  if (process.env.GEMINI_API_KEY) providers.push("gemini");
  if (process.env.GROQ_API_KEY) providers.push("groq");
  return providers;
}

export async function generateReviewDraft({
  provider,
  storeName,
  placeCategory,
  categories,
}: ReviewDraftInput): Promise<string> {
  const categoryLabels = categories.map(
    (id) => REVIEW_CATEGORIES.find((category) => category.id === id)?.label ?? id,
  );
  const prompt = [
    `Write a Google Maps-friendly review for ${storeName}${placeCategory ? `, a ${placeCategory}` : ""}.`,
    `The customer selected these topics as the highlights of their visit: ${categoryLabels.join(", ")}.`,
    "",
    "Write one concise, natural first-person review of 2-4 sentences.",
    "Use the selected topics to shape the praise, but do not invent products, names, prices, wait times, cleanliness details, or other specific incidents.",
    "Keep it warm and specific to a real customer experience without adding unsupported facts.",
    "Do not add a star rating or question.",
    "Return only the editable draft text.",
  ].join("\n");

  if (provider === "openai") return generateWithOpenAi(prompt);
  if (provider === "gemini") return generateWithGemini(prompt);
  return generateWithGroq(prompt);
}

async function generateWithGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API key is not configured.");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content:
            "You help customers express genuine experiences. Never fabricate or embellish facts.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      reasoning_effort: "low",
      reasoning_format: "hidden",
      max_completion_tokens: 512,
    }),
    signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Groq request failed (${response.status}). Check the API key, model access, and account limits.`,
    );
  }

  const result = (await response.json()) as {
    choices?: Array<{
      finish_reason?: string | null;
      message?: { content?: string | null };
    }>;
  };
  const choice = result.choices?.[0];
  const draft = choice?.message?.content?.trim();
  if (!draft) {
    const reason = choice?.finish_reason;
    throw new Error(
      reason === "length"
        ? "Groq reached its completion token limit before returning a draft. Please retry."
        : "Groq returned no draft. Please retry or check the configured model.",
    );
  }
  return draft;
}

async function generateWithOpenAi(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key is not configured.");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You help customers express genuine experiences. Never fabricate or embellish facts.",
        },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 250,
    }),
    signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI request failed (${response.status}). Check the API key, model access, and account limits.`,
    );
  }

  const result = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const draft = result.choices?.[0]?.message?.content?.trim();
  if (!draft) throw new Error("OpenAI returned an empty review draft.");
  return draft;
}

async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Google Gemini API key is not configured.");

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const requestBody = JSON.stringify({
    systemInstruction: {
      parts: [
        {
          text: "You help customers express genuine experiences. Never fabricate or embellish facts.",
        },
      ],
    },
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 250 },
  });
  const deadline = Date.now() + AI_REQUEST_TIMEOUT_MS;
  let response: Response | undefined;

  for (let attempt = 0; attempt <= GEMINI_RETRY_DELAYS_MS.length; attempt += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error(
        "Google Gemini took too long to respond. Please retry.",
      );
    }

    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: requestBody,
      signal: AbortSignal.timeout(remaining),
      cache: "no-store",
    });

    const isTransient =
      response.status === 429 ||
      response.status === 500 ||
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504;
    const retryDelay = GEMINI_RETRY_DELAYS_MS[attempt];

    if (!isTransient || retryDelay === undefined) break;

    await response.body?.cancel();
    if (Date.now() + retryDelay >= deadline) break;
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }

  if (!response?.ok) {
    if (response?.status === 503) {
      throw new Error(
        "Google Gemini is temporarily unavailable (503). Please try again shortly.",
      );
    }
    throw new Error(
      `Google Gemini request failed (${response?.status ?? "unknown"}). Check the API key, model access, and account limits.`,
    );
  }

  const result = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const draft = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!draft) throw new Error("Google Gemini returned an empty review draft.");
  return draft;
}

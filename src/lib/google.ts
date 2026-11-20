/**
 * Builds the Google destination used by the review flow.
 * Place IDs use Google's official write-review URL. Shared Maps URLs open
 * the shared listing directly.
 */
export function buildGoogleReviewUrl(placeOrUrl: string): string {
  const input = placeOrUrl.trim();
  if (/^https?:\/\//i.test(input)) return input;
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(input)}`;
}

export function isValidPlaceId(placeId: string): boolean {
  const trimmed = placeId.trim();
  return trimmed.length >= 10 && /^[A-Za-z0-9_-]+$/.test(trimmed);
}

export function normalizeGoogleMapsInput(input: string): string {
  const trimmed = input.trim();
  if (isValidPlaceId(trimmed)) return trimmed;

  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("Enter a Google Maps shared URL or a Google Place ID.");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Enter a valid Google Maps shared URL.");
  }

  const hostname = url.hostname.toLowerCase();
  const isGoogleMapsHost =
    hostname === "maps.app.goo.gl" ||
    hostname === "g.co" ||
    hostname === "maps.google.com" ||
    hostname === "www.google.com" ||
    hostname === "google.com" ||
    hostname.endsWith(".google.com");

  if (!isGoogleMapsHost) {
    throw new Error("Enter a Google Maps shared URL, not another website.");
  }

  for (const key of ["place_id", "placeid", "query_place_id"]) {
    const value = url.searchParams.get(key)?.trim();
    if (value && isValidPlaceId(value)) return value;
  }

  const q = url.searchParams.get("q")?.trim() ?? "";
  const placeIdMatch = q.match(/(?:place_id:|place_id=)([A-Za-z0-9_-]{10,})/i);
  if (placeIdMatch) return placeIdMatch[1];

  const embeddedMatch = trimmed.match(/place_id[:=]([A-Za-z0-9_-]{10,})/i);
  if (embeddedMatch) return embeddedMatch[1];

  return trimmed;
}

export function isValidGoogleMapsInput(input: string): boolean {
  try {
    normalizeGoogleMapsInput(input);
    return true;
  } catch {
    return false;
  }
}

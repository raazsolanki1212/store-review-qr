/**
 * Builds the official Google "write a review" URL for a Place ID.
 * Customers must submit the review themselves in Google's UI.
 */
export function buildGoogleReviewUrl(placeId: string): string {
  const id = placeId.trim();
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(id)}`;
}

export function isValidPlaceId(placeId: string): boolean {
  // Google Place IDs are typically long alphanumeric strings (often start with ChIJ)
  const trimmed = placeId.trim();
  return trimmed.length >= 10 && /^[A-Za-z0-9_-]+$/.test(trimmed);
}

export function getAppBaseUrl(): string {
  if (process.env.VERCEL && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function getReviewShortUrl(slug: string, baseUrl?: string): string {
  const base = (baseUrl || getAppBaseUrl()).replace(/\/$/, "");
  return `${base}/r/${slug}`;
}

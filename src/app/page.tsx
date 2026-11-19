import { Dashboard } from "@/components/Dashboard";
import { listStores } from "@/lib/db";
import { getAppBaseUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stores = await listStores();
  const baseUrl = getAppBaseUrl();

  return (
    <main className="shell">
      <header className="hero">
        <span className="pill">Legitimate Google review links · no fake posts</span>
        <h1 className="brand">ReviewQR</h1>
        <p className="tagline">
          Create a QR for each store. Customers scan it, land on Google’s write-a-review
          page for that place, and leave a real review themselves.
        </p>
      </header>

      <Dashboard initialStores={stores} baseUrl={baseUrl} />

      <p className="foot-note">
        This app never posts reviews for you. It only deep-links to Google’s official
        review form using the store’s Place ID, and tracks how many times each QR was
        scanned.
      </p>
    </main>
  );
}

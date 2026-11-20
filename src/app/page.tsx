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
          Create a QR for each store. Customers can draft a review from their own
          review, edit it, and choose whether to post it on Google.
        </p>
      </header>

      <Dashboard initialStores={stores} baseUrl={baseUrl} />

      <p className="foot-note">
        AI creates an editable draft from the customer’s own notes. This app never
        posts a review automatically; customers decide what to share on Google.
      </p>
    </main>
  );
}

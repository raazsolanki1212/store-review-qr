import { Dashboard } from "@/components/Dashboard";
import { AdminLogin } from "@/components/AdminLogin";
import { isAdminAuthenticated } from "@/lib/auth";
import { listStores } from "@/lib/db";
import { getAppBaseUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const authenticated = await isAdminAuthenticated();
  const stores = authenticated ? await listStores() : [];
  const baseUrl = authenticated ? getAppBaseUrl() : "";

  return (
    <main className="shell">
      <header className="hero">
        <span className="pill">Legitimate Google review links · no fake posts</span>
        <h1 className="brand">ReviewQR</h1>
        <p className="tagline">
          Create a QR for each store. Customers get an editable review starter
          as soon as they scan, then can personalize it before sharing on Google.
        </p>
      </header>

      {authenticated ? (
        <Dashboard initialStores={stores} baseUrl={baseUrl} />
      ) : (
        <AdminLogin />
      )}

      <p className="foot-note">
        AI uses the store details to create an editable starter, not a claim about
        a customer’s visit. Customers must personalize it and decide what to share.
      </p>
    </main>
  );
}

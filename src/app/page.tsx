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
          Create a QR for each store. Customers get a complete draft based on
          the store details as soon as they scan.
        </p>
      </header>

      {authenticated ? (
        <Dashboard initialStores={stores} baseUrl={baseUrl} />
      ) : (
        <AdminLogin />
      )}

      <p className="foot-note">
        AI drafts use only confirmed store details and do not claim a customer
        visited or experienced anything. Customers decide whether the draft is truthful for them.
      </p>
    </main>
  );
}

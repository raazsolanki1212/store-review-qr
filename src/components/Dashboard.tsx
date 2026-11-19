"use client";

import { useState } from "react";
import type { Store } from "@/lib/types";
import { StoreForm } from "./StoreForm";
import { StoreCard } from "./StoreCard";

type Props = {
  initialStores: Store[];
  baseUrl: string;
};

export function Dashboard({ initialStores, baseUrl }: Props) {
  const [stores, setStores] = useState(initialStores);

  return (
    <div className="dashboard">
      <section className="panel create-panel">
        <header className="panel-header">
          <h2>Add a store</h2>
          <p>
            Link a Google Place ID. We generate a QR that opens Google’s official
            review form — customers write and submit the review themselves.
          </p>
        </header>
        <StoreForm
          onCreated={(store) => setStores((prev) => [store, ...prev])}
        />
      </section>

      <section className="panel list-panel">
        <header className="panel-header">
          <h2>Your stores</h2>
          <p>
            {stores.length === 0
              ? "No stores yet — create one to get a printable QR."
              : `${stores.length} store${stores.length === 1 ? "" : "s"}`}
          </p>
        </header>

        <div className="store-list">
          {stores.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              baseUrl={baseUrl}
              onDeleted={(id) =>
                setStores((prev) => prev.filter((s) => s.id !== id))
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}

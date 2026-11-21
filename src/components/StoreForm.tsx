"use client";

import { FormEvent, useState } from "react";
import type { Store } from "@/lib/types";

type Props = {
  onCreated: (store: Store) => void;
};

export function StoreForm({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [address, setAddress] = useState("");
  const [placeCategory, setPlaceCategory] = useState("");
  const [storeDetails, setStoreDetails] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          placeId,
          address: address || undefined,
          placeCategory: placeCategory || undefined,
          storeDetails: storeDetails || undefined,
          slug: slug || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create store");

      onCreated(data.store as Store);
      setName("");
      setPlaceId("");
      setAddress("");
      setPlaceCategory("");
      setStoreDetails("");
      setSlug("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack-form">
      <div className="field">
        <label htmlFor="name">Store name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Blue Bottle Coffee — MG Road"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="placeId">Google Maps link or Place ID</label>
        <input
          id="placeId"
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
          placeholder="https://maps.app.goo.gl/... or ChIJ..."
          required
        />
        <p className="hint">
          Open Google Maps → Share → Copy link, then paste the shared URL here.
        </p>
      </div>

      <div className="field">
        <label htmlFor="address">Address (optional)</label>
        <input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="12 MG Road, Bengaluru"
        />
      </div>

      <div className="field">
        <label htmlFor="placeCategory">Place category (optional)</label>
        <input
          id="placeCategory"
          value={placeCategory}
          onChange={(e) => setPlaceCategory(e.target.value)}
          placeholder="Restaurant, cafe, hotel, salon..."
          list="place-categories"
          maxLength={100}
          autoComplete="off"
        />
        <datalist id="place-categories">
          <option value="Restaurant" />
          <option value="Cafe" />
          <option value="Hotel" />
          <option value="Retail store" />
          <option value="Salon or spa" />
          <option value="Healthcare clinic" />
          <option value="Gym or fitness center" />
          <option value="Tourist attraction" />
          <option value="Service business" />
        </datalist>
        <p className="hint">
          Helps AI tailor the review draft to this type of place.
        </p>
      </div>

      <div className="field">
        <label htmlFor="storeDetails">Store details (optional)</label>
        <textarea
          id="storeDetails"
          value={storeDetails}
          onChange={(e) => setStoreDetails(e.target.value)}
          placeholder="A short detail about the store, its specialties, or services"
          maxLength={500}
          rows={3}
        />
        <p className="hint">
          Gives the AI accurate context for the review draft. Up to 500 characters.
        </p>
      </div>

      <div className="field">
        <label htmlFor="slug">Custom slug (optional)</label>
        <input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="blue-bottle-mg"
        />
      </div>

      {error ? <p className="error">{error}</p> : null}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Creating…" : "Create store + QR link"}
      </button>
    </form>
  );
}

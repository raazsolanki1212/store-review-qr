"use client";

import { useEffect, useState } from "react";
import type { Store } from "@/lib/types";
import { buildGoogleReviewUrl, isValidPlaceId } from "@/lib/google";

type Props = {
  store: Store;
  baseUrl: string;
  onDeleted: (id: string) => void;
};

export function StoreCard({ store, baseUrl, onDeleted }: Props) {
  const shortUrl = `${baseUrl}/r/${store.slug}`;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/stores/${store.id}/qr?format=json`);
      const data = await res.json();
      if (!cancelled && data.dataUrl) setQrDataUrl(data.dataUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [store.id]);

  async function copyLink() {
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function handleDelete() {
    if (!confirm(`Delete “${store.name}”? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/stores/${store.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      onDeleted(store.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="store-card">
      <div className="store-card-main">
        <div>
          <h3>{store.name}</h3>
          {store.address ? <p className="muted">{store.address}</p> : null}
          <p className="meta">
            <span>{store.scanCount} scans</span>
            <span className="dot">·</span>
            <code>{store.slug}</code>
          </p>
        </div>

        <div className="actions">
          <button type="button" className="btn-ghost" onClick={copyLink}>
            {copied ? "Copied" : "Copy link"}
          </button>
          <a className="btn-ghost" href={`/api/stores/${store.id}/qr`} download>
            Download QR
          </a>
          <a
            className="btn-ghost"
            href={buildGoogleReviewUrl(store.placeId)}
            target="_blank"
            rel="noreferrer"
          >
            {isValidPlaceId(store.placeId) ? "Open Google review" : "Open Google listing"}
          </a>
          <button
            type="button"
            className="btn-danger"
            onClick={handleDelete}
            disabled={busy}
          >
            Delete
          </button>
        </div>

        <p className="short-link">
          QR points to: <a href={shortUrl}>{shortUrl}</a>
        </p>
      </div>

      <div className="qr-pane">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt={`QR for ${store.name}`} width={180} height={180} />
        ) : (
          <div className="qr-skeleton" />
        )}
      </div>
    </article>
  );
}

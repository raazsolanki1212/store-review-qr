"use client";

import { useEffect, useState } from "react";
import type { Store } from "@/lib/types";
import { buildGoogleReviewUrl, isValidPlaceId } from "@/lib/google";

type Props = {
  store: Store;
  baseUrl: string;
  onDeleted: (id: string) => void;
};

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function createReviewPoster(
  qrDataUrl: string,
  store: Store,
): Promise<Blob> {
  const qrImage = new Image();
  qrImage.src = qrDataUrl;
  await new Promise<void>((resolve, reject) => {
    qrImage.onload = () => resolve();
    qrImage.onerror = () => reject(new Error("Could not load the store QR code."));
  });

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1500;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the poster image.");

  context.fillStyle = "#f4f1e8";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#d9dfd4";
  context.lineWidth = 3;
  drawRoundedRect(context, 38, 38, 1124, 1424, 34);
  context.stroke();

  context.fillStyle = "#e3eee6";
  context.beginPath();
  context.arc(1070, 170, 110, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#0d7a5f";
  context.beginPath();
  context.arc(1070, 170, 12, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(1070, 170, 38, 0, Math.PI * 2);
  context.strokeStyle = "#0d7a5f";
  context.lineWidth = 3;
  context.stroke();

  context.fillStyle = "#e3eee6";
  drawRoundedRect(context, 390, 96, 420, 54, 27);
  context.fill();
  context.fillStyle = "#0d624d";
  context.font = "600 21px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("A MOMENT OF YOUR TIME", 600, 123);

  context.fillStyle = "#142a22";
  context.textAlign = "center";
  let nameFontSize = 62;
  context.font = `600 ${nameFontSize}px Georgia, serif`;
  let nameLines = wrapText(context, store.name, 920);
  while (nameLines.length > 2 && nameFontSize > 40) {
    nameFontSize -= 2;
    context.font = `600 ${nameFontSize}px Georgia, serif`;
    nameLines = wrapText(context, store.name, 920);
  }
  if (nameLines.length > 2) {
    nameLines = [nameLines[0], nameLines.slice(1).join(" ")];
  }
  nameLines.slice(0, 2).forEach((line, index) => {
    context.fillText(line, 600, 240 + index * 72, 920);
  });

  context.fillStyle = "#52645b";
  context.font = "400 27px Arial, sans-serif";
  context.fillText("We'd love to hear about your experience.", 600, 372);

  context.shadowColor = "rgba(20, 42, 34, 0.12)";
  context.shadowBlur = 34;
  context.shadowOffsetY = 14;
  context.fillStyle = "#ffffff";
  drawRoundedRect(context, 250, 430, 700, 700, 30);
  context.fill();
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  context.drawImage(qrImage, 314, 494, 572, 572);

  context.fillStyle = "#0d624d";
  context.font = "700 24px Arial, sans-serif";
  context.fillText("SCAN TO LEAVE A REVIEW", 600, 1205);
  context.fillStyle = "#52645b";
  context.font = "400 22px Arial, sans-serif";
  context.fillText("Your kind words help our community grow.", 600, 1252);

  context.strokeStyle = "#d9dfd4";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(420, 1320);
  context.lineTo(780, 1320);
  context.stroke();

  context.fillStyle = "#142a22";
  context.font = "600 20px Arial, sans-serif";
  context.fillText("THANK YOU FOR SUPPORTING OUR STORE", 600, 1370);
  context.fillStyle = "#75847b";
  context.font = "500 18px Arial, sans-serif";
  context.fillText("REVIEWQR", 600, 1410);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export the poster image."));
    }, "image/png");
  });
}

export function StoreCard({ store, baseUrl, onDeleted }: Props) {
  const shortUrl = `${baseUrl}/r/${store.slug}`;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

  async function downloadPoster() {
    if (!qrDataUrl) return;
    setDownloading(true);
    try {
      const poster = await createReviewPoster(qrDataUrl, store);
      const objectUrl = URL.createObjectURL(poster);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${store.slug}-review-poster.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not download the poster.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Delete “${store.name}”? This cannot be undone, and its QR link will be permanently disabled.`,
      )
    ) {
      return;
    }
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
          {store.placeCategory ? (
            <p className="muted">{store.placeCategory}</p>
          ) : null}
          {store.storeDetails ? <p className="muted">{store.storeDetails}</p> : null}
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
          <button
            type="button"
            className="btn-ghost"
            onClick={downloadPoster}
            disabled={!qrDataUrl || downloading}
          >
            {downloading ? "Preparing…" : "Download poster"}
          </button>
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

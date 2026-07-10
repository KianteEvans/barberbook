"use client";

import { useEffect, useState, type ReactNode } from "react";

export interface GalleryPhoto {
  readonly id: string;
  readonly fileName: string;
  readonly caption: string | null;
  readonly barberName: string;
}

/** Work-photo grid with a click-to-enlarge lightbox overlay. */
export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }): ReactNode {
  const [open, setOpen] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        {photos.map((p) => (
          <figure
            key={p.id}
            className="card-hover"
            onClick={() => setOpen(p)}
            style={{
              margin: 0,
              display: "grid",
              gap: 8,
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: 10,
              boxShadow: "var(--shadow-sm)",
              cursor: "zoom-in",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/uploads/${p.fileName}`}
              alt={p.caption ?? `Work by ${p.barberName}`}
              loading="lazy"
              style={{
                width: "100%",
                aspectRatio: "1",
                objectFit: "cover",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border-strong)",
              }}
            />
            <figcaption style={{ display: "grid", gap: 2 }}>
              {p.caption && (
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.caption}</span>
              )}
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{p.barberName}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {open && (
        <div
          className="drawer-overlay"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-label={open.caption ?? `Work by ${open.barberName}`}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "color-mix(in srgb, #000 72%, transparent)",
          }}
        >
          <figure
            onClick={(e) => e.stopPropagation()}
            style={{ margin: 0, display: "grid", gap: 10, maxWidth: "min(92vw, 720px)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/uploads/${open.fileName}`}
              alt={open.caption ?? `Work by ${open.barberName}`}
              style={{
                width: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-strong)",
              }}
            />
            <figcaption
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                color: "#fff",
                fontSize: 13,
              }}
            >
              <span style={{ fontWeight: 600 }}>{open.caption ?? "Fresh cut"}</span>
              <span style={{ opacity: 0.8 }}>{open.barberName}</span>
            </figcaption>
          </figure>
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Close"
            style={{
              position: "fixed",
              top: 16,
              right: 20,
              background: "transparent",
              border: "none",
              color: "#fff",
              fontSize: 30,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

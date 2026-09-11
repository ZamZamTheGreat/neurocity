"use client";

import { useEffect, useState } from "react";
import { ManagedImage } from "./ManagedImage";

type Advertisement = { id: number; headline: string; description: string | null; callToAction: string; merchantName: string; bannerUrl: string | null; storeUrl: string };

export default function AdvertisingBanner({ placement }: { placement: "home" | "marketplace" }) {
  const [items, setItems] = useState<Advertisement[]>([]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    fetch(`/api/advertisements?placement=${placement}`).then(async (response) => {
      const data = await response.json();
      if (response.ok) setItems(Array.isArray(data.advertisements) ? data.advertisements : []);
    }).catch(() => setItems([]));
  }, [placement]);
  if (!items.length) return null;
  const item = items[Math.min(active, items.length - 1)];
  return <section className={`advertising-banner advertising-banner-${placement}`} aria-label="Featured store">
    <a href={item.storeUrl}>
      {item.bannerUrl && <ManagedImage src={item.bannerUrl} alt={`${item.merchantName} advertisement`} />}
      <span className="advertising-banner-shade" />
      <div>
        <small>FEATURED STORE · SPONSORED</small>
        <h2>{item.headline}</h2>
        {item.description && <p>{item.description}</p>}
        <b>{item.callToAction} →</b>
      </div>
    </a>
    {items.length > 1 && <nav aria-label="Choose featured store">{items.map((advertisement, index) => <button key={advertisement.id} className={index === active ? "active" : ""} onClick={() => setActive(index)} aria-label={`Show ${advertisement.merchantName} advertisement`} aria-current={index === active ? "true" : undefined} />)}</nav>}
  </section>;
}

"use client";

import { FormEvent, useState } from "react";

export type DeliveryZone = {
  id: number;
  area: string;
  fee: number;
  estimatedTime: string;
  active: boolean;
};
const blank = { area: "", fee: 0, estimatedTime: "Same day" };

export default function DeliveryZonesPanel({
  zones,
  setZones,
  reload,
  setMessage,
  deliveryEnabled,
}: {
  zones: DeliveryZone[];
  setZones: (zones: DeliveryZone[]) => void;
  reload: () => Promise<void>;
  setMessage: (message: string) => void;
  deliveryEnabled: boolean;
}) {
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/merchant/delivery-zones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(data.error);
    setDraft(blank);
    setMessage(`${data.zone.area} is now a delivery area.`);
    await reload();
  }
  async function save(zone: DeliveryZone) {
    const response = await fetch("/api/merchant/delivery-zones", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(zone),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    setMessage(`${zone.area} delivery settings saved.`);
    await reload();
  }
  async function remove(zone: DeliveryZone) {
    if (!window.confirm(`Remove ${zone.area} from your delivery areas?`))
      return;
    const response = await fetch("/api/merchant/delivery-zones", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: zone.id }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    setMessage(`${zone.area} removed.`);
    await reload();
  }
  return (
    <section className="delivery-zone-panel">
      <header>
        <div>
          <p className="eyebrow">Local fulfilment</p>
          <h2>Delivery areas and fees</h2>
          <ul className="info-list"><li>Checkout matches the customer’s saved suburb to these areas.</li><li>Enter suburb names exactly as customers commonly write them.</li></ul>
        </div>
        <span className={deliveryEnabled ? "enabled" : "disabled"}>
          {deliveryEnabled ? "Delivery enabled" : "Enable delivery above"}
        </span>
      </header>
      <form onSubmit={create}>
        <label>
          Suburb or area
          <input
            required
            placeholder="e.g. Pioneerspark"
            value={draft.area}
            onChange={(event) =>
              setDraft({ ...draft, area: event.target.value })
            }
          />
        </label>
        <label>
          Fee (N$)
          <input
            required
            min="0"
            step="0.01"
            type="number"
            value={draft.fee}
            onChange={(event) =>
              setDraft({ ...draft, fee: Number(event.target.value) })
            }
          />
        </label>
        <label>
          Estimated time
          <input
            required
            placeholder="e.g. 2–4 hours"
            value={draft.estimatedTime}
            onChange={(event) =>
              setDraft({ ...draft, estimatedTime: event.target.value })
            }
          />
        </label>
        <button disabled={busy}>{busy ? "Adding…" : "+ Add area"}</button>
      </form>
      {zones.length ? (
        <div className="delivery-zone-list">
          {zones.map((zone) => (
            <article key={zone.id}>
              <label>
                Area
                <input
                  value={zone.area}
                  onChange={(event) =>
                    setZones(
                      zones.map((item) =>
                        item.id === zone.id
                          ? { ...item, area: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Fee
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  value={zone.fee}
                  onChange={(event) =>
                    setZones(
                      zones.map((item) =>
                        item.id === zone.id
                          ? { ...item, fee: Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Estimate
                <input
                  value={zone.estimatedTime}
                  onChange={(event) =>
                    setZones(
                      zones.map((item) =>
                        item.id === zone.id
                          ? { ...item, estimatedTime: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <label className="zone-active">
                <input
                  type="checkbox"
                  checked={zone.active}
                  onChange={(event) =>
                    setZones(
                      zones.map((item) =>
                        item.id === zone.id
                          ? { ...item, active: event.target.checked }
                          : item,
                      ),
                    )
                  }
                />{" "}
                Active
              </label>
              <button onClick={() => save(zone)}>Save</button>
              <button className="danger-text" onClick={() => remove(zone)}>
                Remove
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="delivery-zone-empty">
          <strong>No delivery areas configured</strong>
          <ul className="info-list centered"><li>Pickup can still be used.</li><li>Add at least one area before accepting delivery orders.</li></ul>
        </div>
      )}
    </section>
  );
}

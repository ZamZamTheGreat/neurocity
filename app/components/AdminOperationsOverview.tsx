import { useMemo, useState } from "react";

export type OperationsEvent = { id: number; action: string; area: string; severity: "normal" | "attention" | "critical"; resourceType: string; resourceId: string; metadata: Record<string, unknown>; createdAt: string; reviewStatus: "open" | "acknowledged" | "resolved"; reviewNote: string | null };
export type OperationsData = { generatedAt: string; windowDays: number; summary: { attention: number; critical: number; whatsappReceived: number; whatsappDelivered: number; whatsappFailed: number }; integrations: { name: string; configured: boolean; detail: string }[]; attention: OperationsEvent[]; recent: OperationsEvent[] };

const words = (value: string) => value.replaceAll(".", " · ").replaceAll("_", " ");
const when = (value: string) => new Intl.DateTimeFormat("en-NA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function AdminOperationsOverview({ data, onNavigate, onRefresh, notify }: { data: OperationsData | null; onNavigate: (view: "applications" | "orders" | "transactions") => void; onRefresh: () => Promise<void>; notify: (message: string) => void }) {
  const [filter, setFilter] = useState<"open" | "acknowledged" | "all">("open");
  const [busyId, setBusyId] = useState<number | null>(null);
  const visibleAttention = useMemo(() => data?.attention.filter((event) => filter === "all" || event.reviewStatus === filter) ?? [], [data, filter]);
  async function review(event: OperationsEvent, status: "acknowledged" | "resolved") {
    const note = status === "resolved" ? window.prompt("How was this incident resolved?")?.trim() : null;
    if (status === "resolved" && !note) return;
    setBusyId(event.id);
    try {
      const response = await fetch("/api/admin/operations", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventId: event.id, status, note }) });
      const result = await response.json();
      notify(response.ok ? `Event ${status}.` : result.error);
      if (response.ok) await onRefresh();
    } catch { notify("The incident could not be updated. Try again."); }
    finally { setBusyId(null); }
  }
  if (!data) return <div className="operations-loading"><span />Loading live operations…</div>;
  const configured = data.integrations.filter((item) => item.configured).length;
  return <div className="operations-overview">
    <section className="operations-scorecard" aria-label="Operations status">
      <article className={data.summary.critical ? "critical" : "healthy"}><span>Immediate attention</span><strong>{data.summary.critical}</strong><small>{data.summary.critical ? "Critical events in the last 7 days" : "No critical events in the last 7 days"}</small></article>
      <article><span>Review queue</span><strong>{data.summary.attention}</strong><small>Events needing an operator check</small></article>
      <article><span>WhatsApp activity</span><strong>{data.summary.whatsappReceived + data.summary.whatsappDelivered}</strong><small>{data.summary.whatsappFailed} failed or skipped</small></article>
      <article><span>Services ready</span><strong>{configured}/{data.integrations.length}</strong><small>Production integrations configured</small></article>
    </section>

    <section className="operations-grid">
      <article className="operations-panel operations-queue">
        <header><div><p className="eyebrow">Action queue</p><h3>What needs attention</h3></div><div className="incident-filters"><button className={filter === "open" ? "active" : ""} onClick={() => setFilter("open")}>Open</button><button className={filter === "acknowledged" ? "active" : ""} onClick={() => setFilter("acknowledged")}>Acknowledged</button><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button></div></header>
        {visibleAttention.length ? <div className="operations-event-list">{visibleAttention.slice(0, 8).map((event) => <EventRow key={event.id} event={event} busy={busyId === event.id} review={review} onNavigate={onNavigate} />)}</div> : <div className="operations-clear"><b>All clear</b><p>No events match this queue.</p></div>}
        <footer><button onClick={() => onNavigate("applications")}>Review applications</button><button onClick={() => onNavigate("orders")}>Open order support</button><button onClick={() => onNavigate("transactions")}>Check payments</button></footer>
      </article>

      <article className="operations-panel integration-panel">
        <header><div><p className="eyebrow">Readiness</p><h3>Connected services</h3></div><span>{configured} ready</span></header>
        <div>{data.integrations.map((item) => <div className="integration-row" key={item.name}><i className={item.configured ? "ready" : "pending"} aria-hidden="true" /><p><b>{item.name}</b><small>{item.detail}</small></p><strong>{item.configured ? "Ready" : "Set up"}</strong></div>)}</div>
      </article>
    </section>

    <section className="operations-panel activity-panel">
      <header><div><p className="eyebrow">Audit trail</p><h3>Recent platform activity</h3></div><small>Updated {when(data.generatedAt)}</small></header>
      {data.recent.length ? <div className="activity-table"><div className="activity-heading"><span>Event</span><span>Area</span><span>Record</span><span>Time</span></div>{data.recent.slice(0, 12).map((event) => <div key={event.id}><span><i className={`event-mark ${event.severity}`} />{words(event.action)}</span><span>{event.area}</span><span>{words(event.resourceType)} #{event.resourceId}</span><time dateTime={event.createdAt}>{when(event.createdAt)}</time></div>)}</div> : <div className="operations-clear"><b>No recent activity</b><p>New administrative, order, payment and messaging events will appear here.</p></div>}
    </section>
  </div>;
}

function EventRow({ event, busy, review, onNavigate }: { event: OperationsEvent; busy: boolean; review: (event: OperationsEvent, status: "acknowledged" | "resolved") => void; onNavigate: (view: "applications" | "orders" | "transactions") => void }) {
  const target = event.area === "Orders" ? "orders" : event.area === "Payments" ? "transactions" : event.area === "Merchants" ? "applications" : null;
  return <div className="operations-event"><i className={`event-mark ${event.severity}`} /><div><b>{words(event.action)}</b><span>{event.area} · {words(event.resourceType)} #{event.resourceId}</span>{event.reviewNote && <small>{event.reviewNote}</small>}</div><time dateTime={event.createdAt}>{when(event.createdAt)}</time><div className="incident-actions">{target && <button onClick={() => onNavigate(target)}>Open section</button>}{event.reviewStatus === "open" && <button disabled={busy} onClick={() => review(event, "acknowledged")}>Acknowledge</button>}<button disabled={busy} onClick={() => review(event, "resolved")}>Resolve</button></div></div>;
}

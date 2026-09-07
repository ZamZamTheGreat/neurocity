import { FormEvent, useEffect, useMemo, useState } from "react";

export type OperationsEvent = { id: number; action: string; area: string; severity: "normal" | "attention" | "critical"; resourceType: string; resourceId: string; metadata: Record<string, unknown>; createdAt: string; reviewStatus: "open" | "acknowledged" | "resolved"; reviewNote: string | null };
export type OperationsData = { generatedAt: string; windowDays: number; summary: { attention: number; critical: number; whatsappReceived: number; whatsappDelivered: number; whatsappFailed: number }; integrations: { name: string; configured: boolean; detail: string }[]; attention: OperationsEvent[]; recent: OperationsEvent[] };
type BreachIncident = { id: number; title: string; detectedAt: string; nature: string; likelyConsequences: string; measuresTaken: string; contactEmail: string; affectedUserIds: number[]; riskLevel: string; status: string; authorityNotifiedAt: string | null; authorityReference: string | null; notificationAttempts: number; notificationFailures: number; notifiedAt: string | null };
const emptyBreach = { title: "", detectedAt: "", nature: "", likelyConsequences: "", measuresTaken: "", contactEmail: "", affectedEmails: "", riskLevel: "under_assessment" };

const words = (value: string) => value.replaceAll(".", " · ").replaceAll("_", " ");
const when = (value: string) => new Intl.DateTimeFormat("en-NA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function AdminOperationsOverview({ data, onNavigate, onRefresh, notify }: { data: OperationsData | null; onNavigate: (view: "applications" | "orders" | "transactions") => void; onRefresh: () => Promise<void>; notify: (message: string) => void }) {
  const [filter, setFilter] = useState<"open" | "acknowledged" | "all">("open");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [incidents, setIncidents] = useState<BreachIncident[]>([]);
  const [breach, setBreach] = useState(emptyBreach);
  const [showBreachForm, setShowBreachForm] = useState(false);
  const [breachBusy, setBreachBusy] = useState(false);
  const visibleAttention = useMemo(() => data?.attention.filter((event) => filter === "all" || event.reviewStatus === filter) ?? [], [data, filter]);
  async function loadIncidents() {
    const response = await fetch("/api/admin/data-breaches");
    if (response.ok) setIncidents((await response.json()).incidents ?? []);
  }
  useEffect(() => { void loadIncidents(); }, []);
  async function recordBreach(event: FormEvent) {
    event.preventDefault(); setBreachBusy(true);
    try {
      const response = await fetch("/api/admin/data-breaches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(breach) });
      const result = await response.json(); notify(response.ok ? "Data breach recorded as a draft." : result.error);
      if (response.ok) { setBreach(emptyBreach); setShowBreachForm(false); await loadIncidents(); await onRefresh(); }
    } catch { notify("The data breach could not be recorded. Try again."); } finally { setBreachBusy(false); }
  }
  async function notifyAffected(incident: BreachIncident) {
    if (!window.confirm(`Send this privacy notice to ${incident.affectedUserIds.length} affected user${incident.affectedUserIds.length === 1 ? "" : "s"}? The message cannot be recalled.`)) return;
    setBreachBusy(true);
    try {
      const response = await fetch("/api/admin/data-breaches", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ incidentId: incident.id, action: "notify" }) });
      const result = await response.json(); notify(response.ok ? `Notification attempted for ${result.attempted} user(s); ${result.failed} failed.` : result.error);
      if (response.ok) { await loadIncidents(); await onRefresh(); }
    } catch { notify("Affected users could not be notified. Try again."); } finally { setBreachBusy(false); }
  }
  async function recordAuthorityNotice(incident: BreachIncident) {
    const authorityReference = window.prompt("Supervisory authority reference")?.trim(); if (!authorityReference) return;
    const authorityNotifiedAt = window.prompt("Notification time (ISO date and time)", new Date().toISOString())?.trim(); if (!authorityNotifiedAt) return;
    const response = await fetch("/api/admin/data-breaches", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ incidentId: incident.id, action: "authority", authorityReference, authorityNotifiedAt }) });
    const result = await response.json(); notify(response.ok ? "Authority notification recorded." : result.error); if (response.ok) await loadIncidents();
  }
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

    <section className="operations-panel breach-panel">
      <header><div><p className="eyebrow">Privacy incident register</p><h3>Data breach response</h3></div><button onClick={() => setShowBreachForm((value) => !value)}>{showBreachForm ? "Close form" : "Record incident"}</button></header>
      <div className="breach-guidance"><b>Record every personal-data breach.</b><span>Assess risk, document the decision, notify the competent authority within 72 hours where required, and contact affected people without undue delay where high risk is likely.</span></div>
      {showBreachForm && <form className="breach-form" onSubmit={recordBreach}>
        <label><span>Incident title</span><input required value={breach.title} onChange={(event) => setBreach({ ...breach, title: event.target.value })} /></label>
        <label><span>Detected at</span><input required type="datetime-local" value={breach.detectedAt} onChange={(event) => setBreach({ ...breach, detectedAt: event.target.value })} /></label>
        <label><span>Risk assessment</span><select value={breach.riskLevel} onChange={(event) => setBreach({ ...breach, riskLevel: event.target.value })}><option value="under_assessment">Under assessment</option><option value="low">Unlikely risk</option><option value="risk">Risk</option><option value="high_risk">High risk</option></select></label>
        <label className="wide"><span>Affected registered-user emails</span><textarea required value={breach.affectedEmails} onChange={(event) => setBreach({ ...breach, affectedEmails: event.target.value })} placeholder="One or more email addresses, separated by commas or new lines" /></label>
        <label className="wide"><span>Nature of the breach</span><textarea required value={breach.nature} onChange={(event) => setBreach({ ...breach, nature: event.target.value })} placeholder="What happened, including the data and people affected" /></label>
        <label className="wide"><span>Likely consequences</span><textarea required value={breach.likelyConsequences} onChange={(event) => setBreach({ ...breach, likelyConsequences: event.target.value })} /></label>
        <label className="wide"><span>Measures taken and user guidance</span><textarea required value={breach.measuresTaken} onChange={(event) => setBreach({ ...breach, measuresTaken: event.target.value })} /></label>
        <label><span>Privacy contact email</span><input required type="email" value={breach.contactEmail} onChange={(event) => setBreach({ ...breach, contactEmail: event.target.value })} /></label>
        <button disabled={breachBusy}>{breachBusy ? "Saving…" : "Save incident draft"}</button>
      </form>}
      {incidents.length ? <div className="breach-list">{incidents.map((incident) => <article key={incident.id}><div><span className={`breach-risk ${incident.riskLevel}`}>{words(incident.riskLevel)}</span><h4>{incident.title}</h4><p>Detected {when(incident.detectedAt)} · {incident.affectedUserIds.length} affected user(s)</p><small>{incident.notifiedAt ? `Users notified ${when(incident.notifiedAt)}${incident.notificationFailures ? ` · ${incident.notificationFailures} failed` : ""}` : "User notification pending"}{incident.authorityNotifiedAt ? ` · Authority notified ${when(incident.authorityNotifiedAt)}` : ""}</small></div><div>{!incident.authorityNotifiedAt && <button onClick={() => recordAuthorityNotice(incident)}>Record authority notice</button>}{!incident.notifiedAt && <button disabled={breachBusy} onClick={() => notifyAffected(incident)}>Notify affected users</button>}</div></article>)}</div> : <div className="operations-clear"><b>No recorded data breaches</b><p>Use this register if a confidentiality, integrity or availability incident involves personal data.</p></div>}
    </section>
  </div>;
}

function EventRow({ event, busy, review, onNavigate }: { event: OperationsEvent; busy: boolean; review: (event: OperationsEvent, status: "acknowledged" | "resolved") => void; onNavigate: (view: "applications" | "orders" | "transactions") => void }) {
  const target = event.area === "Orders" ? "orders" : event.area === "Payments" ? "transactions" : event.area === "Merchants" ? "applications" : null;
  return <div className="operations-event"><i className={`event-mark ${event.severity}`} /><div><b>{words(event.action)}</b><span>{event.area} · {words(event.resourceType)} #{event.resourceId}</span>{event.reviewNote && <small>{event.reviewNote}</small>}</div><time dateTime={event.createdAt}>{when(event.createdAt)}</time><div className="incident-actions">{target && <button onClick={() => onNavigate(target)}>Open section</button>}{event.reviewStatus === "open" && <button disabled={busy} onClick={() => review(event, "acknowledged")}>Acknowledge</button>}<button disabled={busy} onClick={() => review(event, "resolved")}>Resolve</button></div></div>;
}

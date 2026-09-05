"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminOrderCentre, {
  type AdminOrder,
} from "../components/AdminOrderCentre";
import MallPlatformManager, {
  type MallPlatform,
} from "../components/MallPlatformManager";
import AdminTransactionLedger, { type AdminTransaction, type TransactionSummary } from "../components/AdminTransactionLedger";

type Document = {
  id: number;
  documentType: string;
  status: string;
  originalName: string | null;
  viewUrl: string | null;
};
type Application = {
  id: number;
  merchantId: number | null;
  reference: string;
  status: string;
  tradingName: string;
  legalName: string;
  category: string;
  targetPlatformName: string;
  locationType: string;
  mainOperatingArea: string;
  physicalAddress: string;
  branchLocations: string;
  representativeName: string;
  email: string;
  phone: string;
  description: string;
  submittedAt: string;
  documents?: Document[];
};
type Merchant = {
  id: number;
  name: string;
  category: string;
  status: string;
  contactName: string | null;
  contactEmail: string | null;
  createdAt: string;
};
type View = "applications" | "merchants" | "orders" | "transactions" | "malls";

export default function AdminPage() {
  const [items, setItems] = useState<Application[] | null>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary>({ totalRecords: 0, successfulValue: 0, pendingCount: 0, failedCount: 0, unsettledValue: 0 });
  const [orderAnalytics, setOrderAnalytics] = useState({
    grossPaid: 0,
    refunded: 0,
    activeOrders: 0,
    openIssues: 0,
    completedOrders: 0,
  });
  const [platforms, setPlatforms] = useState<MallPlatform[]>([]);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<View>("applications");
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  async function load() {
    const [response, orderResponse, transactionResponse, platformResponse] = await Promise.all([
      fetch("/api/admin/applications"),
      fetch("/api/admin/orders"),
      fetch("/api/admin/transactions"),
      fetch("/api/admin/platforms"),
    ]);
    if (response.status === 401 || response.status === 403) {
      window.location.replace("/login?account_type=administrator&return_to=%2Fadmin");
      return;
    }
    if (!response.ok) return setMessage("Administration is temporarily unavailable. Please try again.");
    const data = await response.json();
    setItems(data.applications);
    setMerchants(data.merchants ?? []);
    if (orderResponse.ok) {
      const orderData = await orderResponse.json();
      setOrders(orderData.orders ?? []);
      setOrderAnalytics(
        orderData.analytics ?? {
          grossPaid: 0,
          refunded: 0,
          activeOrders: 0,
          openIssues: 0,
          completedOrders: 0,
        },
      );
    }
    if (transactionResponse.ok) {
      const transactionData = await transactionResponse.json();
      setTransactions(transactionData.transactions ?? []);
      setTransactionSummary(transactionData.summary ?? { totalRecords: 0, successfulValue: 0, pendingCount: 0, failedCount: 0, unsettledValue: 0 });
    }
    if (platformResponse.ok) {
      const platformData = await platformResponse.json();
      setPlatforms(platformData.platforms ?? []);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const filteredApplications = useMemo(
    () =>
      (items ?? []).filter(
        (item) =>
          (filter === "all" || item.status === filter) &&
          `${item.tradingName} ${item.legalName} ${item.reference} ${item.email}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [items, filter, search],
  );
  const filteredMerchants = useMemo(
    () =>
      merchants.filter(
        (merchant) =>
          (filter === "all" || merchant.status === filter) &&
          `${merchant.name} ${merchant.category} ${merchant.contactEmail ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [merchants, filter, search],
  );
  const pending = (items ?? []).filter((item) =>
    ["submitted", "under_review", "more_information_required"].includes(
      item.status,
    ),
  ).length;
  const active = merchants.filter((merchant) =>
    ["active", "pilot", "onboarding"].includes(merchant.status),
  ).length;
  const uploaded = (items ?? []).filter((item) =>
    item.documents?.length === 4 && item.documents.every((document) => document.status === "uploaded"),
  ).length;

  async function review(id: number, status: string) {
    if (status === "delete") {
      const application = items?.find((item) => item.id === id);
      if (!application) return;
      const confirmation = window
        .prompt(
          `Permanently delete ${application.tradingName}'s application and uploaded documents?\n\nEnter ${application.reference} to confirm.`,
        )
        ?.trim();
      if (!confirmation) return;
      setDeletingId(id);
      try {
        const response = await fetch("/api/admin/applications", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, confirmation }),
        });
        const data = await response.json();
        setMessage(
          response.ok
            ? `${application.reference} and its application documents were deleted.${data.storageFailures ? ` ${data.storageFailures} storage file(s) require manual cleanup.` : ""}`
            : data.error,
        );
        if (response.ok) {
          setItems((current) => current?.filter((item) => item.id !== id) ?? current);
          void load();
        }
      } catch {
        setMessage("The application could not be deleted. Check the connection and try again.");
      } finally {
        setDeletingId(null);
      }
      return;
    }
    const notes = window.prompt("Add a review note (optional)") ?? "";
    const response = await fetch("/api/admin/applications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status, notes }),
    });
    const data = await response.json();
    setMessage(
      response.ok
        ? `Application moved to ${status.replaceAll("_", " ")}.`
        : data.error,
    );
    if (response.ok) await load();
  }
  async function changeMerchant(
    merchant: Merchant,
    status: "active" | "suspended" | "removed",
  ) {
    if (
      status === "removed" &&
      !window.confirm(
        `Remove ${merchant.name} from NeuroCity? Their storefront and dashboard access will be disabled, while records are retained.`,
      )
    )
      return;
    const reason =
      status === "active"
        ? (window.prompt("Optional reactivation note") ?? "")
        : (window.prompt(
            `Reason for ${status === "suspended" ? "suspension" : "removal"} (required)`,
          ) ?? "");
    if (status !== "active" && !reason.trim())
      return setMessage("A reason is required.");
    const response = await fetch("/api/admin/merchants", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchantId: merchant.id,
        status,
        reason,
        confirmation: status === "removed" ? "REMOVE" : undefined,
      }),
    });
    const data = await response.json();
    setMessage(response.ok ? `${merchant.name} is now ${status}.` : data.error);
    if (response.ok) await load();
  }
  async function updatePayment(order: AdminOrder, paymentStatus: string) {
    const note = ["failed", "refunded"].includes(paymentStatus)
      ? window.prompt(`Reason for ${paymentStatus}`)?.trim()
      : undefined;
    if (["failed", "refunded"].includes(paymentStatus) && !note) return;
    const response = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: order.id, paymentStatus, note }),
    });
    const data = await response.json();
    setMessage(
      response.ok
        ? `${order.reference} payment marked ${paymentStatus}.`
        : data.error,
    );
    if (response.ok) await load();
  }
  async function resolveIssue(order: AdminOrder, issueId: number) {
    const resolution = window
      .prompt("Resolution provided to the customer")
      ?.trim();
    if (!resolution) return;
    const response = await fetch("/api/admin/orders", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ issueId, status: "resolved", resolution }),
    });
    const data = await response.json();
    setMessage(response.ok ? `${order.reference} issue resolved.` : data.error);
    if (response.ok) await load();
  }
  function switchView(next: View) {
    setView(next);
    setMenuOpen(false);
    setFilter("all");
    setSearch("");
  }

  if (!items)
    return (
      <AdminLogin message={message} />
    );

  return (
    <main id="main-content" className="admin-page admin-workspace">
      <header className="admin-topbar">
        <a href="/" className="brand">
          <span>Neuro</span>
          <strong>City</strong>
        </a>
        <nav className="platform-nav" aria-label="Platform navigation">
          <a href="/">Network</a>
          <a href="/marketplace">Marketplace</a>
          <a href="/malls">Digital malls</a>
        </nav>
        <div>
          <span className="admin-indicator">Administrator</span>
          <a href="/">View mall ↗</a>
        </div>
      </header>
      <section className="admin-welcome">
        <div>
          <button className="workspace-menu-toggle admin-menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open administration menu" aria-expanded={menuOpen}><i aria-hidden="true"><span /><span /><span /></i><span>Menu</span></button>
          <p className="eyebrow">NeuroCity control room</p>
          <h1>Platform operations</h1>
          <p className="admin-welcome-copy">Review onboarding, protect marketplace quality and keep orders, payments and digital malls moving.</p>
        </div>
        <button onClick={load}>Refresh data</button>
      </section>
      <section className="admin-priority-bar" aria-label="Operational priorities">
        <div><span className={pending ? "priority-dot attention" : "priority-dot"} /><p><strong>{pending} application{pending === 1 ? "" : "s"}</strong><small>awaiting an onboarding decision</small></p></div>
        <div><span className={orderAnalytics.openIssues ? "priority-dot attention" : "priority-dot"} /><p><strong>{orderAnalytics.openIssues} open issue{orderAnalytics.openIssues === 1 ? "" : "s"}</strong><small>requiring order support</small></p></div>
        <div><span className={transactionSummary.pendingCount ? "priority-dot attention" : "priority-dot"} /><p><strong>{transactionSummary.pendingCount} pending payment{transactionSummary.pendingCount === 1 ? "" : "s"}</strong><small>to reconcile in the ledger</small></p></div>
      </section>
      {message && (
        <button className="workspace-message" onClick={() => setMessage("")}>
          {message}
          <span>×</span>
        </button>
      )}
      <section className="admin-metrics" aria-label="Administration summary">
        <button
          onClick={() => {
            switchView("applications");
            setFilter("all");
          }}
        >
          <span>All applications</span>
          <strong>{items.length}</strong>
          <small>Since launch</small>
        </button>
        <button
          onClick={() => {
            switchView("applications");
            setFilter("submitted");
          }}
        >
          <span>Needs attention</span>
          <strong>{pending}</strong>
          <small>Pending decisions</small>
        </button>
        <button
          onClick={() => {
            switchView("applications");
            setFilter("all");
          }}
        >
          <span>Documents complete</span>
          <strong>{uploaded}</strong>
          <small>Ready to verify</small>
        </button>
        <button
          onClick={() => {
            switchView("merchants");
            setFilter("all");
          }}
        >
          <span>Active merchants</span>
          <strong>{active}</strong>
          <small>With platform access</small>
        </button>
      </section>
      <nav className={`admin-tabs${menuOpen ? " workspace-drawer-open" : ""}`} aria-label="Administration sections">
        <div className="admin-drawer-heading"><b>Administration</b><button onClick={() => setMenuOpen(false)} aria-label="Close administration menu">×</button></div>
        <button
          className={view === "applications" ? "active" : ""}
          onClick={() => switchView("applications")}
        >
          <span>Applications</span>
          <b>{items.length}</b>
        </button>
        <button
          className={view === "merchants" ? "active" : ""}
          onClick={() => switchView("merchants")}
        >
          <span>Merchants</span>
          <b>{merchants.length}</b>
        </button>
        <button
          className={view === "orders" ? "active" : ""}
          onClick={() => switchView("orders")}
        >
          <span>Orders</span>
          <b>{orders.length}</b>
        </button>
        <button
          className={view === "transactions" ? "active" : ""}
          onClick={() => switchView("transactions")}
        >
          <span>Transactions</span>
          <b>{transactions.length}</b>
        </button>
        <button
          className={view === "malls" ? "active" : ""}
          onClick={() => switchView("malls")}
        >
          <span>Digital malls</span>
          <b>{platforms.length}</b>
        </button>
      </nav>
      {menuOpen && <button className="workspace-drawer-backdrop admin-drawer-backdrop" onClick={() => setMenuOpen(false)} aria-label="Close administration menu" />}
      <section
        className={`admin-content ${view === "malls" ? "mall-admin-content" : ""}`}
      >
        <div className="admin-content-head">
          <div>
            <h2>
              {view === "applications"
                ? "Merchant applications"
                : view === "merchants"
                  ? "Approved merchants"
                  : view === "orders"
                    ? "Marketplace orders"
                    : view === "transactions"
                      ? "Transaction ledger"
                    : "Digital mall network"}
            </h2>
            <p>
              {view === "applications"
                ? "Verify information, inspect documents and make an approval decision."
                : view === "merchants"
                  ? "Control storefront and dashboard access after approval."
                  : view === "orders"
                    ? "Monitor every transaction, payment proof and refund across NeuroCity."
                    : view === "transactions"
                      ? "Reconcile every payment record, provider result and merchant allocation from one ledger."
                    : "Create and operate branded digital destinations from the shared NeuroCity commerce engine."}
            </p>
          </div>
          {(view === "applications" || view === "merchants") && (
            <div className="admin-controls">
              <label>
                <span className="sr-only">Search</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={
                    view === "applications"
                      ? "Search applications…"
                      : "Search merchants…"
                  }
                />
              </label>
              <label>
                <span className="sr-only">Filter by status</span>
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  {view === "applications" ? (
                    <>
                      <option value="all">All statuses</option>
                      <option value="submitted">Submitted</option>
                      <option value="under_review">Under review</option>
                      <option value="more_information_required">
                        Information required
                      </option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </>
                  ) : (
                    <>
                      <option value="all">All statuses</option>
                      <option value="active">Active</option>
                      <option value="onboarding">Onboarding</option>
                      <option value="pilot">Pilot</option>
                      <option value="suspended">Suspended</option>
                      <option value="removed">Removed</option>
                    </>
                  )}
                </select>
              </label>
            </div>
          )}
        </div>
        {view === "applications" ? (
          <ApplicationList items={filteredApplications} review={review} deletingId={deletingId} />
        ) : view === "merchants" ? (
          <MerchantList
            merchants={filteredMerchants}
            changeMerchant={changeMerchant}
          />
        ) : view === "orders" ? (
          <AdminOrderCentre
            orders={orders}
            analytics={orderAnalytics}
            updatePayment={updatePayment}
            resolveIssue={resolveIssue}
          />
        ) : view === "transactions" ? (
          <AdminTransactionLedger transactions={transactions} summary={transactionSummary} />
        ) : (
          <MallPlatformManager
            platforms={platforms}
            merchants={merchants.map((merchant) => ({
              ...merchant,
              isPublic: ["active", "pilot"].includes(merchant.status),
            }))}
            reload={load}
            notify={setMessage}
          />
        )}
      </section>
    </main>
  );
}

function AdminLogin({
  message,
}: {
  message: string;
}) {
  return (
    <main className="admin-auth">
      <a href="/" className="brand">
        <span>Neuro</span>
        <strong>City</strong>
      </a>
      <section>
        <p className="eyebrow">NeuroCity administration</p>
        <h1>Administrator login required</h1>
        <p>Continue through NeuroCity’s protected sign-in flow using your password, authenticator code and security challenge.</p>
        {message && <p className="form-error">{message}</p>}
        <Link className="auth-submit" href="/login?account_type=administrator&return_to=%2Fadmin">Continue to secure sign in</Link>
      </section>
    </main>
  );
}

function ApplicationList({
  items,
  review,
  deletingId,
}: {
  items: Application[];
  review: (id: number, status: string) => Promise<void>;
  deletingId: number | null;
}) {
  if (!items.length)
    return (
      <EmptyState
        title="No applications found"
        text="Try changing the search or status filter."
      />
    );
  return (
    <div className="application-review-list">
      {items.map((item) => {
        const completeDocuments =
          item.documents?.filter((document) => document.status === "uploaded")
            .length ?? 0;
        return (
          <article className="application-review-card" key={item.id}>
            <header>
              <div>
                <span className={`review-status status-${item.status}`}>
                  {item.status.replaceAll("_", " ")}
                </span>
                <h3>{item.tradingName}</h3>
                <p>
                  {item.legalName} · {item.category}
                </p>
                <small>Applying to {item.targetPlatformName}</small>
              </div>
              <div className="application-reference-small">
                <span>Reference</span>
                <strong>{item.reference}</strong>
                <small>
                  {new Date(item.submittedAt).toLocaleDateString("en-NA")}
                </small>
              </div>
            </header>
            <div className="application-review-body">
              <div>
                <span>Representative</span>
                <strong>{item.representativeName}</strong>
                <a href={`mailto:${item.email}`}>{item.email}</a>
                <small>{item.phone}</small>
              </div>
              <div>
                <span>Location and operating area</span>
                <strong>{item.mainOperatingArea}</strong>
                <p>
                  {item.locationType.replaceAll("_", " ")} ·{" "}
                  {item.physicalAddress}
                </p>
                <small>{item.branchLocations}</small>
              </div>
              <div>
                <span>Business summary</span>
                <p>{item.description}</p>
              </div>
            </div>
            <div className="document-review">
              <div>
                <strong>Required documents</strong>
                <span>{completeDocuments} of 4 uploaded</span>
              </div>
              <div>
                {item.documents?.map((document) =>
                  document.viewUrl ? (
                    <a
                      key={document.id}
                      href={document.viewUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {document.documentType.replaceAll("_", " ")}{" "}
                      <b>View ↗</b>
                    </a>
                  ) : (
                    <span key={document.id}>
                      {document.documentType.replaceAll("_", " ")}{" "}
                      <b>{document.status.replaceAll("_", " ")}</b>
                    </span>
                  ),
                )}
              </div>
            </div>
            <footer>
              <div>
                {!["approved", "rejected"].includes(item.status) && (
                  <button
                    onClick={() => review(item.id, "more_information_required")}
                  >
                    Request information
                  </button>
                )}
                {item.status === "submitted" && (
                  <button onClick={() => review(item.id, "under_review")}>
                    Start review
                  </button>
                )}
              </div>
              <div>
                {item.merchantId ? (
                  <span className="managed-record-note" title="Approved merchant records are retained for financial and audit integrity.">Managed under Merchants</span>
                ) : (
                  <button
                    className="danger-text"
                    disabled={deletingId === item.id}
                    onClick={() => review(item.id, "delete")}
                  >
                    {deletingId === item.id ? "Deleting…" : "Delete data"}
                  </button>
                )}
                {!item.merchantId && item.status !== "rejected" && (
                  <button
                    className="danger-text"
                    onClick={() => review(item.id, "rejected")}
                  >
                    Reject
                  </button>
                )}
                {!item.merchantId && item.status !== "approved" && (
                  <button
                    className="primary-action"
                    disabled={completeDocuments !== 4}
                    title={completeDocuments !== 4 ? "All four required documents must be uploaded first." : "Create the merchant workspace and owner access."}
                    onClick={() => review(item.id, "approved")}
                  >
                    {completeDocuments === 4 ? "Approve merchant" : `Awaiting documents (${completeDocuments}/4)`}
                  </button>
                )}
              </div>
            </footer>
          </article>
        );
      })}
    </div>
  );
}

function MerchantList({
  merchants,
  changeMerchant,
}: {
  merchants: Merchant[];
  changeMerchant: (
    merchant: Merchant,
    status: "active" | "suspended" | "removed",
  ) => void;
}) {
  if (!merchants.length)
    return (
      <EmptyState
        title="No merchants found"
        text="Approved merchant workspaces will appear here."
      />
    );
  return (
    <div className="merchant-table">
      <div className="merchant-table-head">
        <span>Merchant</span>
        <span>Contact</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
      {merchants.map((merchant) => (
        <article key={merchant.id}>
          <div>
            <strong>{merchant.name}</strong>
            <span>{merchant.category}</span>
          </div>
          <div>
            <strong>{merchant.contactName ?? "Not provided"}</strong>
            <span>{merchant.contactEmail ?? "No email"}</span>
          </div>
          <span className={`merchant-status status-${merchant.status}`}>
            {merchant.status}
          </span>
          <div className="merchant-actions">
            {!["active", "pilot"].includes(merchant.status) && (
              <button
                className="approve"
                onClick={() => changeMerchant(merchant, "active")}
              >
                Reactivate
              </button>
            )}
            {!["suspended", "removed"].includes(merchant.status) && (
              <button onClick={() => changeMerchant(merchant, "suspended")}>
                Suspend
              </button>
            )}
            {merchant.status !== "removed" && (
              <button
                className="reject"
                onClick={() => changeMerchant(merchant, "removed")}
              >
                Remove
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="admin-empty">
      <span>NC</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

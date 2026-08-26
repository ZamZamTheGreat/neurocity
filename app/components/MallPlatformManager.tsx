"use client";

import { FormEvent, useState } from "react";

type Merchant = {
  id: number;
  name: string;
  category: string;
  status: string;
  isPublic: boolean;
};
type Domain = {
  id: number;
  hostname: string;
  isPrimary: boolean;
  verifiedAt: string | null;
};
type Assignment = {
  id: number;
  merchantId: number;
  status: string;
  featured: boolean;
};
type MallManager = {
  id: number;
  role: string;
  user: { displayName: string; email: string } | null;
};
export type MallPlatform = {
  id: number;
  name: string;
  slug: string;
  kind: string;
  status: string;
  country: string;
  city: string | null;
  tagline: string | null;
  theme: Record<string, string>;
  domains: Domain[];
  merchants: Assignment[];
  managers: MallManager[];
};

export default function MallPlatformManager({
  platforms,
  merchants,
  reload,
  notify,
}: {
  platforms: MallPlatform[];
  merchants: Merchant[];
  reload: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    city: "Windhoek",
    tagline: "",
    hostname: "",
  });
  async function request(body: object) {
    const response = await fetch("/api/admin/platforms", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    notify(response.ok ? "Mall configuration updated." : data.error);
    if (response.ok) await reload();
  }
  async function create(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/platforms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...draft, kind: "mall" }),
    });
    const data = await response.json();
    if (!response.ok) return notify(data.error);
    setDraft({ name: "", city: "Windhoek", tagline: "", hostname: "" });
    setCreating(false);
    notify(`${data.platform.name} created.`);
    await reload();
  }
  return (
    <div className="mall-manager">
      <section className="mall-manager-intro">
        <div>
          <span>WHITE-LABEL NETWORK</span>
          <h3>
            {platforms.length} digital{" "}
            {platforms.length === 1 ? "destination" : "destinations"}
          </h3>
          <p>
            Each destination runs on the same NeuroCity engine while keeping its
            own identity, domain and participating stores.
          </p>
        </div>
        <button onClick={() => setCreating(!creating)}>
          {creating ? "Cancel" : "+ Create digital mall"}
        </button>
      </section>
      {creating && (
        <form className="mall-create" onSubmit={create}>
          <header>
            <div>
              <small>NEW PLATFORM</small>
              <h3>Create a white-label mall</h3>
            </div>
            <span>Step 1 of 1</span>
          </header>
          <div>
            <label>
              Mall name
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Example: Central Square Mall"
              />
            </label>
            <label>
              Launch city
              <input
                required
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              />
            </label>
            <label className="wide">
              Positioning line
              <input
                value={draft.tagline}
                onChange={(e) =>
                  setDraft({ ...draft, tagline: e.target.value })
                }
                placeholder="Everything you love, now online."
              />
            </label>
            <label className="wide">
              Domain (optional)
              <input
                value={draft.hostname}
                onChange={(e) =>
                  setDraft({ ...draft, hostname: e.target.value })
                }
                placeholder="shop.example.com.na"
              />
            </label>
          </div>
          <footer>
            <p>Brand assets and merchants can be added after creation.</p>
            <button>Create mall</button>
          </footer>
        </form>
      )}
      <div className="mall-grid">
        {platforms.map((platform) => (
          <MallCard
            key={platform.id}
            platform={platform}
            merchants={merchants}
            request={request}
          />
        ))}
      </div>
    </div>
  );
}

function MallCard({
  platform,
  merchants,
  request,
}: {
  platform: MallPlatform;
  merchants: Merchant[];
  request: (body: object) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [domain, setDomain] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [values, setValues] = useState({
    name: platform.name,
    city: platform.city ?? "",
    tagline: platform.tagline ?? "",
    primary: platform.theme?.primary ?? "#18c98e",
    surface: platform.theme?.surface ?? "#07111f",
  });
  const assignedIds = new Set(
    platform.merchants.map((item) => item.merchantId),
  );
  const available = merchants.filter(
    (merchant) => !assignedIds.has(merchant.id),
  );
  const changeLifecycle = (
    status: "onboarding" | "active" | "suspended" | "removed",
  ) => {
    const reason = ["suspended", "removed"].includes(status)
      ? window
          .prompt(
            `Reason for ${status === "suspended" ? "suspending" : "removing"} ${platform.name}`,
          )
          ?.trim()
      : "";
    if (["suspended", "removed"].includes(status) && !reason) return;
    request({ action: "lifecycle", platformId: platform.id, status, reason });
  };
  return (
    <article className="mall-card">
      <header
        style={{
          background: `linear-gradient(135deg,${values.surface},${values.primary}55)`,
        }}
      >
        <div className="mall-monogram">
          {platform.name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .slice(0, 2)}
        </div>
        <div>
          <span>
            {platform.kind === "mall"
              ? "WHITE-LABEL MALL"
              : "NATIONAL MARKETPLACE"}
          </span>
          <h3>{platform.name}</h3>
          <p>
            {platform.city ?? platform.country} · {platform.status}
          </p>
        </div>
        <div className="mall-card-actions">
          <a
            href={
              platform.kind === "mall"
                ? `/malls/${encodeURIComponent(platform.slug)}`
                : "/marketplace"
            }
            target="_blank"
            rel="noreferrer"
          >
            Open ↗
          </a>
          <button onClick={() => setEditing(!editing)}>
            {editing ? "Close" : "Manage"}
          </button>
        </div>
      </header>
      <div className="mall-card-stats">
        <div>
          <strong>{platform.merchants.length}</strong>
          <span>Stores assigned</span>
        </div>
        <div>
          <strong>{platform.domains.length}</strong>
          <span>Domains</span>
        </div>
        <div>
          <strong>
            {
              platform.merchants.filter((item) => item.status === "active")
                .length
            }
          </strong>
          <span>Active listings</span>
        </div>
      </div>
      <p className="mall-tagline">
        {platform.tagline ?? "No positioning line added yet."}
      </p>
      {editing && (
        <div className="mall-editor">
          <section>
            <h4>Lifecycle and access</h4>
            <p>
              Control whether this destination is onboarding, publicly active,
              temporarily suspended or removed from the network.
            </p>
            <div className="merchant-actions">
              {platform.status !== "active" && (
                <button
                  className="approve"
                  onClick={() => changeLifecycle("active")}
                >
                  Activate
                </button>
              )}
              {platform.kind === "mall" && platform.status !== "onboarding" && (
                <button onClick={() => changeLifecycle("onboarding")}>
                  Return to onboarding
                </button>
              )}
              {platform.kind === "mall" &&
                !["suspended", "removed"].includes(platform.status) && (
                  <button onClick={() => changeLifecycle("suspended")}>
                    Suspend
                  </button>
                )}
              {platform.kind === "mall" && platform.status !== "removed" && (
                <button
                  className="reject"
                  onClick={() => changeLifecycle("removed")}
                >
                  Remove
                </button>
              )}
            </div>
          </section>
          <section>
            <h4>Identity and theme</h4>
            <div className="mall-form-grid">
              <label>
                Name
                <input
                  value={values.name}
                  onChange={(e) =>
                    setValues({ ...values, name: e.target.value })
                  }
                />
              </label>
              <label>
                City
                <input
                  value={values.city}
                  onChange={(e) =>
                    setValues({ ...values, city: e.target.value })
                  }
                />
              </label>
              <label className="wide">
                Positioning line
                <input
                  value={values.tagline}
                  onChange={(e) =>
                    setValues({ ...values, tagline: e.target.value })
                  }
                />
              </label>
              <label>
                Primary colour
                <input
                  type="color"
                  value={values.primary}
                  onChange={(e) =>
                    setValues({ ...values, primary: e.target.value })
                  }
                />
              </label>
              <label>
                Surface colour
                <input
                  type="color"
                  value={values.surface}
                  onChange={(e) =>
                    setValues({ ...values, surface: e.target.value })
                  }
                />
              </label>
            </div>
            <button
              onClick={() =>
                request({
                  action: "update",
                  platformId: platform.id,
                  ...values,
                })
              }
            >
              Save identity
            </button>
          </section>
          <section>
            <h4>Domains</h4>
            <div className="mall-domain-list">
              {platform.domains.map((item) => (
                <div key={item.id}>
                  <span>
                    <i className={item.verifiedAt ? "verified" : ""} />
                    {item.hostname}
                    {item.isPrimary && <small>PRIMARY</small>}
                  </span>
                  {!item.isPrimary && (
                    <button
                      onClick={() =>
                        request({
                          action: "remove_domain",
                          platformId: platform.id,
                          domainId: item.id,
                        })
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mall-inline">
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="mall-domain.com.na"
              />
              <button
                disabled={!domain.trim()}
                onClick={() => {
                  request({
                    action: "add_domain",
                    platformId: platform.id,
                    hostname: domain,
                  });
                  setDomain("");
                }}
              >
                Add domain
              </button>
            </div>
          </section>
          <section>
            <h4>Participating stores</h4>
            <div className="mall-assignment-list">
              {platform.merchants.map((assignment) => {
                const merchant = merchants.find(
                  (item) => item.id === assignment.merchantId,
                );
                return (
                  <div key={assignment.id}>
                    <span>
                      <b>
                        {merchant?.name ?? `Merchant ${assignment.merchantId}`}
                      </b>
                      <small>{merchant?.category}</small>
                    </span>
                    <button
                      onClick={() =>
                        request({
                          action: "remove_merchant",
                          platformId: platform.id,
                          merchantId: assignment.id,
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mall-inline">
              <select
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
              >
                <option value="">Select merchant…</option>
                {available.map((merchant) => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.name}
                  </option>
                ))}
              </select>
              <button
                disabled={!merchantId}
                onClick={() => {
                  request({
                    action: "assign_merchant",
                    platformId: platform.id,
                    merchantId: Number(merchantId),
                  });
                  setMerchantId("");
                }}
              >
                Assign store
              </button>
            </div>
          </section>
          <section>
            <h4>Mall management team</h4>
            <p>
              Managers use their existing NeuroCity account to operate this
              destination.
            </p>
            <div className="mall-assignment-list">
              {platform.managers?.map((manager) => (
                <div key={manager.id}>
                  <span>
                    <b>{manager.user?.displayName ?? "Mall manager"}</b>
                    <small>
                      {manager.user?.email} · {manager.role}
                    </small>
                  </span>
                  <button
                    onClick={() =>
                      request({
                        action: "remove_manager",
                        platformId: platform.id,
                        membershipId: manager.id,
                      })
                    }
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
            <div className="mall-inline">
              <input
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                placeholder="manager@example.com"
              />
              <button
                disabled={!managerEmail.trim()}
                onClick={() => {
                  request({
                    action: "add_manager",
                    platformId: platform.id,
                    email: managerEmail,
                    role: "manager",
                  });
                  setManagerEmail("");
                }}
              >
                Grant manager access
              </button>
            </div>
          </section>
        </div>
      )}
    </article>
  );
}

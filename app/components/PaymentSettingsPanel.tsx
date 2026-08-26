"use client";

export type PaymentSettings = {
  payOnCollectionEnabled: boolean;
  eftEnabled: boolean;
  bankName: string;
  accountHolder: string;
  accountType: string;
  accountNumber: string;
  branchCode: string;
  referenceInstructions: string;
};

export default function PaymentSettingsPanel({
  settings,
  setSettings,
  setMessage,
}: {
  settings: PaymentSettings;
  setSettings: (settings: PaymentSettings) => void;
  setMessage: (message: string) => void;
}) {
  async function save() {
    const response = await fetch("/api/merchant/payments", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    setSettings(data.settings);
    setMessage("Payment methods and customer instructions saved.");
  }
  return (
    <section className="payment-settings-panel">
      <header>
        <div>
          <p className="eyebrow">Getting paid</p>
          <h2>Payment methods</h2>
          <ul className="info-list"><li>Customers see banking instructions only after placing an EFT order.</li><li>Each order uses its own NeuroCity reference.</li></ul>
        </div>
        <span>{settings.eftEnabled ? "EFT ready" : "Collection payments"}</span>
      </header>
      <div className="payment-method-switches">
        <label>
          <input
            type="checkbox"
            checked={settings.payOnCollectionEnabled}
            onChange={(event) =>
              setSettings({
                ...settings,
                payOnCollectionEnabled: event.target.checked,
              })
            }
          />
          <span>
            <b>Pay on collection</b>
            <small>Customer pays when collecting from the store.</small>
          </span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.eftEnabled}
            onChange={(event) =>
              setSettings({ ...settings, eftEnabled: event.target.checked })
            }
          />
          <span>
            <b>EFT / bank transfer</b>
            <small>Customer uploads proof for verification.</small>
          </span>
        </label>
      </div>
      {settings.eftEnabled && (
        <div className="payment-fields">
          <label>
            Bank
            <select
              value={settings.bankName}
              onChange={(event) =>
                setSettings({ ...settings, bankName: event.target.value })
              }
            >
              <option value="">Choose bank</option>
              <option>FNB Namibia</option>
              <option>Nedbank Namibia</option>
              <option>Bank Windhoek</option>
              <option>Standard Bank Namibia</option>
              <option>Letshego Bank Namibia</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            Account holder
            <input
              value={settings.accountHolder}
              onChange={(event) =>
                setSettings({ ...settings, accountHolder: event.target.value })
              }
            />
          </label>
          <label>
            Account type
            <input
              placeholder="e.g. Business cheque"
              value={settings.accountType}
              onChange={(event) =>
                setSettings({ ...settings, accountType: event.target.value })
              }
            />
          </label>
          <label>
            Account number
            <input
              inputMode="numeric"
              value={settings.accountNumber}
              onChange={(event) =>
                setSettings({ ...settings, accountNumber: event.target.value })
              }
            />
          </label>
          <label>
            Branch code
            <input
              inputMode="numeric"
              value={settings.branchCode}
              onChange={(event) =>
                setSettings({ ...settings, branchCode: event.target.value })
              }
            />
          </label>
          <label className="wide">
            Reference instructions
            <textarea
              value={settings.referenceInstructions}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  referenceInstructions: event.target.value,
                })
              }
            />
          </label>
        </div>
      )}
      <footer>
        <button onClick={save}>Save payment settings</button>
      </footer>
    </section>
  );
}

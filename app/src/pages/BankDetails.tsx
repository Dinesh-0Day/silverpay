import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { userApi, getErrorMessage, type BankAccount } from "../api";
import ErrorAlert from "../components/ErrorAlert";
import PageStatus from "../components/PageStatus";

const emptyBank: BankAccount = {
  accountHolder: "",
  accountNumber: "",
  ifsc: "",
  bankName: "",
  upiId: "",
};

function maskAccount(num: string) {
  if (num.length <= 4) return num;
  return `•••• ${num.slice(-4)}`;
}

export default function BankDetails() {
  const [bank, setBank] = useState<BankAccount>(emptyBank);
  const [hasSaved, setHasSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError("");
    return userApi
      .me()
      .then((u) => {
        if (u.bankAccount) {
          setBank(u.bankAccount);
          setHasSaved(true);
        } else {
          setBank(emptyBank);
          setHasSaved(false);
        }
      })
      .catch((e) => setLoadError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  const saveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      await userApi.saveBank({
        ...bank,
        ifsc: bank.ifsc.trim().toUpperCase(),
        upiId: bank.upiId?.trim() || undefined,
      });
      setHasSaved(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(getErrorMessage(err, "Could not save bank details"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <Link to="/profile" className="profile-back">
        ← My profile
      </Link>

      <header className="profile-subhead">
        <h1>Bank & UPI</h1>
        <p>Add payout details for withdrawals. Admin pays manually to this account.</p>
      </header>

      <PageStatus loading={loading} error={loadError} onRetry={load}>
        {hasSaved && bank.accountNumber && (
          <div className="profile-bank-summary">
            <p className="profile-bank-summary-label">Saved account</p>
            <p className="profile-bank-summary-name">{bank.accountHolder}</p>
            <p className="profile-bank-summary-meta">
              {bank.bankName} · {maskAccount(bank.accountNumber)}
            </p>
            {bank.upiId && <p className="profile-bank-summary-upi">UPI: {bank.upiId}</p>}
          </div>
        )}

        <form onSubmit={saveBank} className="profile-form-card">
          <h2 className="profile-form-title">{hasSaved ? "Update details" : "Add details"}</h2>

          <div className="profile-field">
            <label htmlFor="accountHolder">Account holder name</label>
            <input
              id="accountHolder"
              className="profile-input"
              value={bank.accountHolder}
              onChange={(e) => setBank({ ...bank, accountHolder: e.target.value })}
              placeholder="As per bank passbook"
              required
            />
          </div>

          <div className="profile-field">
            <label htmlFor="accountNumber">Account number</label>
            <input
              id="accountNumber"
              className="profile-input"
              inputMode="numeric"
              value={bank.accountNumber}
              onChange={(e) => setBank({ ...bank, accountNumber: e.target.value.replace(/\D/g, "") })}
              placeholder="Enter account number"
              required
            />
          </div>

          <div className="profile-field-row">
            <div className="profile-field">
              <label htmlFor="ifsc">IFSC code</label>
              <input
                id="ifsc"
                className="profile-input font-mono uppercase"
                value={bank.ifsc}
                onChange={(e) => setBank({ ...bank, ifsc: e.target.value.toUpperCase() })}
                placeholder="SBIN0001234"
                maxLength={11}
                required
              />
            </div>
            <div className="profile-field">
              <label htmlFor="bankName">Bank name</label>
              <input
                id="bankName"
                className="profile-input"
                value={bank.bankName}
                onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                placeholder="e.g. SBI"
                required
              />
            </div>
          </div>

          <div className="profile-field">
            <label htmlFor="upiId">
              UPI ID <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="upiId"
              className="profile-input"
              value={bank.upiId ?? ""}
              onChange={(e) => setBank({ ...bank, upiId: e.target.value })}
              placeholder="name@upi"
            />
          </div>

          <ErrorAlert message={saveError} />

          <button type="submit" disabled={saving} className="profile-btn-primary">
            {saving ? "Saving…" : saved ? "Saved ✓" : hasSaved ? "Update details" : "Save bank details"}
          </button>
        </form>

        <p className="profile-footnote">
          Your details are stored securely and used only when processing withdrawal requests.
        </p>
      </PageStatus>
    </div>
  );
}

import { useEffect, useState } from "react";
import { adminApi, getErrorMessage, type AdminUsersPage, type UserRow, type PaginationMeta } from "../api";
import { PageHeader, Card, LoadingBlock, DataTable, PageError } from "../components/ui";
import PaginationBar from "../components/PaginationBar";

const PAGE_SIZE = 25;

function ReferredByCell({ ref }: { ref: UserRow["referredBy"] }) {
  if (!ref) return <span className="text-slate-400">—</span>;
  if (ref.type === "ADMIN") {
    return (
      <div className="text-sm">
        <span className="inline-block rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase px-1.5 py-0.5 mb-1">
          Admin
        </span>
        <p className="font-mono font-semibold text-slate-800">{ref.code}</p>
        <p className="text-slate-600">{ref.name || ref.email}</p>
        {ref.email && ref.name && <p className="text-xs text-slate-400">{ref.email}</p>}
      </div>
    );
  }
  return (
    <div className="text-sm">
      <span className="inline-block rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase px-1.5 py-0.5 mb-1">
        User
      </span>
      <p className="font-mono font-semibold text-slate-800">{ref.code}</p>
      <p className="text-slate-600">{ref.mobile ? `+91 ${ref.mobile}` : ref.name || `UID ${ref.uid}`}</p>
      {ref.uid && <p className="text-xs text-slate-400 font-mono">UID {ref.uid}</p>}
    </div>
  );
}

export default function Users() {
  const [pageData, setPageData] = useState<AdminUsersPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = (p = page) => {
    setLoading(true);
    setError("");
    return adminApi
      .users({ page: p, limit: PAGE_SIZE })
      .then((res) => {
        setPageData(res);
        setPage(res.pagination.page);
      })
      .catch((e) => {
        setPageData(null);
        setError(getErrorMessage(e));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load(page);
  }, [page]);

  const list = pageData?.items ?? [];
  const admin = pageData?.admin;
  const pagination: PaginationMeta | null = pageData?.pagination ?? null;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Users" description="Registered users, referral codes, and referrers" />
      <PageError message={error} onRetry={() => load(page)} />

      {admin && (
        <Card className="mb-6 border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 mb-2">Your admin account</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Name</p>
              <p className="font-semibold text-slate-900">{admin.name || "—"}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Email</p>
              <p className="font-medium text-slate-900">{admin.email}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Your referral code</p>
              <p className="font-mono font-bold text-lg text-indigo-700">{admin.referralCode}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Share with signups</p>
              <p className="text-slate-600 text-xs leading-relaxed">
                Users enter this code when creating an account (not UID).
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card padding={false}>
        {loading ? (
          <LoadingBlock />
        ) : (
          <>
            <DataTable
              emptyTitle="No users yet"
              columns={[
                { key: "uid", label: "UID" },
                { key: "mobile", label: "Mobile" },
                { key: "referralCode", label: "Referral code" },
                { key: "referredBy", label: "Referred by" },
                { key: "balance", label: "Balance" },
                { key: "held", label: "Held" },
              ]}
              rows={list.map((u) => ({
                id: u.id,
                cells: [
                  <span className="font-mono font-semibold text-slate-800">{u.uid}</span>,
                  <span className="font-medium">{u.mobile ? `+91 ${u.mobile}` : u.email || "—"}</span>,
                  <span className="font-mono text-sm font-semibold text-brand-700">{u.referralCode || "—"}</span>,
                  <ReferredByCell ref={u.referredBy} />,
                  <span className="font-bold tabular-nums text-slate-900">₹{u.wallet?.balance?.toFixed(2) ?? "0.00"}</span>,
                  <span className="text-slate-500 tabular-nums">₹{u.wallet?.held?.toFixed(2) ?? "0.00"}</span>,
                ],
              }))}
            />
            {pagination && (
              <div className="px-4 pb-4">
                <PaginationBar pagination={pagination} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

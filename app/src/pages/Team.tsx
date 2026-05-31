import { useState } from "react";
import { userApi, type TeamMember } from "../api";
import PageStatus from "../components/PageStatus";
import { formatWalletInr } from "../lib/currency";
import { usePageLoad } from "../hooks/usePageLoad";

function formatJoined(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function shareText(code: string, link: string) {
  return `Join SilverPay with my referral code ${code}\n${link}`;
}

export default function Team() {
  const { data, loading, error, reload } = usePageLoad(() => userApi.team(), []);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [tab, setTab] = useState<"direct" | "subordinate">("direct");

  const referralLink =
    typeof window !== "undefined" && data?.myReferralCode
      ? `${window.location.origin}/register?ref=${encodeURIComponent(data.myReferralCode)}`
      : "";

  const copy = async (text: string, which: "code" | "link") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (which === "code") {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      /* ignore */
    }
  };

  const shareInvite = async () => {
    if (!data?.myReferralCode || !referralLink) return;
    const text = shareText(data.myReferralCode, referralLink);
    if (navigator.share) {
      try {
        await navigator.share({ title: "SilverPay", text });
        return;
      } catch {
        /* fall through */
      }
    }
    await copy(text, "link");
  };

  const direct = data?.directMembers ?? [];
  const subordinate = data?.subordinateMembers ?? [];
  const list = tab === "direct" ? direct : subordinate;

  return (
    <div className="team-page">
      <h2 className="app-page-title-lg">My Team</h2>
      <p className="app-page-lead">Referral network, direct members & full downline</p>

      <PageStatus loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <section className="team-hero">
              <p className="team-hero-label">Your referral code</p>
              <button type="button" className="team-code-row" onClick={() => void copy(data.myReferralCode, "code")}>
                <strong>{data.myReferralCode}</strong>
                <span>{copiedCode ? "Copied" : "Tap to copy"}</span>
              </button>
              <div className="team-hero-actions">
                <button type="button" className="team-btn" onClick={() => void copy(referralLink, "link")}>
                  {copiedLink ? "Link copied" : "Copy invite link"}
                </button>
                <button type="button" className="team-btn team-btn-primary" onClick={() => void shareInvite()}>
                  Share invite
                </button>
              </div>
            </section>

            {data.referredBy && (
              <section className="team-referrer">
                <p className="team-section-label">You joined via</p>
                <div className="team-referrer-card">
                  <div>
                    <strong>{data.referredBy.name || data.referredBy.code}</strong>
                    <p className="team-referrer-meta">
                      {data.referredBy.type === "ADMIN" ? "Admin" : "Member"} · Code {data.referredBy.code}
                      {data.referredBy.uid ? ` · UID ${data.referredBy.uid}` : ""}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section className="team-stats">
              <div className="team-stat">
                <span>Total team</span>
                <strong>{data.stats.totalTeam}</strong>
              </div>
              <div className="team-stat">
                <span>Direct</span>
                <strong>{data.stats.directCount}</strong>
              </div>
              <div className="team-stat">
                <span>Subordinate</span>
                <strong>{data.stats.subordinateCount}</strong>
              </div>
              <div className="team-stat">
                <span>Active</span>
                <strong>{data.stats.activeMembers}</strong>
              </div>
              <div className="team-stat team-stat-wide">
                <span>Team deposits (approved)</span>
                <strong>{formatWalletInr(data.stats.teamDepositVolume)}</strong>
              </div>
              <div className="team-stat">
                <span>Deposit orders</span>
                <strong>{data.stats.teamDepositCount}</strong>
              </div>
            </section>

            <div className="team-tabs">
              <button
                type="button"
                className={tab === "direct" ? "team-tab is-active" : "team-tab"}
                onClick={() => setTab("direct")}
              >
                Direct ({direct.length})
              </button>
              <button
                type="button"
                className={tab === "subordinate" ? "team-tab is-active" : "team-tab"}
                onClick={() => setTab("subordinate")}
              >
                Subordinate ({subordinate.length})
              </button>
            </div>

            <section className="team-list-section">
              <p className="team-section-label">
                {tab === "direct"
                  ? "Members who used your referral code"
                  : "Downline under your direct team (level 2+)"}
              </p>

              {!list.length ? (
                <div className="team-empty">
                  <p>{tab === "direct" ? "No direct referrals yet." : "No subordinate members yet."}</p>
                  <p className="team-empty-hint">Share your code to grow your team.</p>
                </div>
              ) : (
                <ul className="team-member-list">
                  {list.map((m) => (
                    <TeamMemberCard key={m.id} member={m} isDirect={tab === "direct"} />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </PageStatus>
    </div>
  );
}

function TeamMemberCard({ member, isDirect }: { member: TeamMember; isDirect: boolean }) {
  const label = member.name.trim() || member.mobile || `UID ${member.uid}`;
  const active = member.approvedDeposits > 0;

  return (
    <li className="team-member-card">
      <div className="team-member-head">
        <div>
          <p className="team-member-name">{label}</p>
          <p className="team-member-sub">
            UID {member.uid}
            {member.mobile ? ` · ${member.mobile}` : ""}
          </p>
        </div>
        <span className={`team-level-badge ${active ? "is-active" : ""}`}>
          L{member.level}
          {active ? " · Active" : ""}
        </span>
      </div>

      <div className="team-member-grid">
        <div>
          <span>Joined</span>
          <strong>{formatJoined(member.joinedAt)}</strong>
        </div>
        <div>
          <span>Code</span>
          <strong>{member.referralCode || "—"}</strong>
        </div>
        <div>
          <span>Deposits</span>
          <strong>{formatWalletInr(member.approvedDeposits)}</strong>
        </div>
        <div>
          <span>Orders</span>
          <strong>{member.depositCount}</strong>
        </div>
        {isDirect && (
          <>
            <div>
              <span>Direct downline</span>
              <strong>{member.personalDownline ?? 0}</strong>
            </div>
            <div>
              <span>Total downline</span>
              <strong>{member.totalDownline ?? 0}</strong>
            </div>
          </>
        )}
        {!isDirect && member.viaCode && (
          <div className="team-member-via">
            <span>Via</span>
            <strong>{member.viaLabel || member.viaCode}</strong>
          </div>
        )}
      </div>
    </li>
  );
}

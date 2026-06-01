import { useEffect, useState } from "react";
import { PageHeader, Card, Button, Input, Label, LoadingBlock, Alert, SectionTitle } from "../components/ui";
import { adminApi, getErrorMessage, type HomeBannerSlide } from "../api";
import { UserCog, KeyRound, Coins, Megaphone, Smartphone, BellRing, Gift } from "lucide-react";
import { REWARD_TASK_OPTIONS, type NewbieRewardItem, type NewbieRewardTaskType } from "../api";

export default function Settings() {
  const [profile, setProfile] = useState<{ email: string; name: string } | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [usdtToInrRate, setUsdtToInrRate] = useState("");
  const [minUsdtDeposit, setMinUsdtDeposit] = useState("");
  const [todayInrBonusPercent, setTodayInrBonusPercent] = useState("");
  const [referralCommissionPercent, setReferralCommissionPercent] = useState("");
  const [ratePassword, setRatePassword] = useState("");
  const [rewardsEnabled, setRewardsEnabled] = useState(true);
  const [rewardsTitle, setRewardsTitle] = useState("");
  const [rewardsSubtitle, setRewardsSubtitle] = useState("");
  const [rewardItems, setRewardItems] = useState<NewbieRewardItem[]>([]);
  const [rewardsPassword, setRewardsPassword] = useState("");
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoImageUrl, setPromoImageUrl] = useState("");
  const [promoLinkUrl, setPromoLinkUrl] = useState("");
  const [promoPassword, setPromoPassword] = useState("");
  const [promoUploading, setPromoUploading] = useState(false);
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerSlides, setBannerSlides] = useState<HomeBannerSlide[]>([]);
  const [bannerPassword, setBannerPassword] = useState("");
  const [bannerUploadingIndex, setBannerUploadingIndex] = useState<number | null>(null);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsApiKey, setSmsApiKey] = useState("");
  const [smsKeyMasked, setSmsKeyMasked] = useState("");
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [smsPassword, setSmsPassword] = useState("");
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyBody, setNotifyBody] = useState("");
  const [notifyUserId, setNotifyUserId] = useState("");
  const [sendingNotify, setSendingNotify] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([
      adminApi.me(),
      adminApi.platformSettings(),
      adminApi.newbieRewards(),
      adminApi.homeBanner(),
      adminApi.homePromo(),
      adminApi.smsSettings(),
    ]).then(([p, settings, rewards, banner, promo, sms]) => {
        setProfile(p);
        setEmail(p.email);
        setName(p.name || "");
        setUsdtToInrRate(String(settings.usdtToInrRate));
        setMinUsdtDeposit(String(settings.minUsdtDeposit ?? 1));
        setTodayInrBonusPercent(String(settings.todayInrBonusPercent ?? 0));
        setReferralCommissionPercent(String(settings.referralCommissionPercent ?? 5));
        setRewardsEnabled(rewards.enabled);
        setRewardsTitle(rewards.title);
        setRewardsSubtitle(rewards.subtitle);
        setRewardItems(rewards.items?.length ? rewards.items : []);
        setPromoEnabled(promo.enabled);
        setPromoImageUrl(promo.imageUrl ?? "");
        setPromoLinkUrl(promo.linkUrl ?? "");
        setBannerEnabled(banner.enabled);
        const slides =
          banner.slides?.length > 0
            ? banner.slides
            : banner.title || banner.message || banner.imageUrl
              ? [
                  {
                    id: "slide-1",
                    title: banner.title,
                    message: banner.message,
                    imageUrl: banner.imageUrl,
                  },
                ]
              : [{ id: "slide-1", title: "", message: "", imageUrl: "" }];
        setBannerSlides(slides);
        setSmsEnabled(sms.enabled);
        setSmsConfigured(sms.configured);
        setSmsKeyMasked(sms.apiKeyMasked);
      });
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await adminApi.updateMe({ email, name, currentPassword: profilePassword });
      setMsg("Profile saved to database.");
      setProfilePassword("");
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  const saveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Number(usdtToInrRate);
    const minUsdt = Number(minUsdtDeposit);
    const bonusPercent = Number(todayInrBonusPercent);
    const referralPct = Number(referralCommissionPercent);
    if (!rate || rate <= 0) {
      setErr("Enter a valid USDT rate");
      return;
    }
    if (!minUsdt || minUsdt <= 0) {
      setErr("Enter a valid minimum USDT deposit");
      return;
    }
    if (!Number.isFinite(bonusPercent) || bonusPercent < 0 || bonusPercent > 100) {
      setErr("Enter today's INR bonus % between 0 and 100");
      return;
    }
    if (!Number.isFinite(referralPct) || referralPct < 0 || referralPct > 100) {
      setErr("Enter referral commission % between 0 and 100");
      return;
    }
    setErr("");
    setMsg("");
    try {
      const updated = await adminApi.updatePlatformSettings({
        usdtToInrRate: rate,
        minUsdtDeposit: minUsdt,
        todayInrBonusPercent: bonusPercent,
        referralCommissionPercent: referralPct,
        currentPassword: ratePassword,
      });
      setUsdtToInrRate(String(updated.usdtToInrRate));
      setMinUsdtDeposit(String(updated.minUsdtDeposit ?? minUsdt));
      setTodayInrBonusPercent(String(updated.todayInrBonusPercent ?? 0));
      setReferralCommissionPercent(String(updated.referralCommissionPercent ?? 5));
      setRatePassword("");
      setMsg("Home rates & team commission % saved.");
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  const onBannerFile = async (slideIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploadingIndex(slideIndex);
    setErr("");
    try {
      const { imageUrl } = await adminApi.uploadHomeBannerImage(file);
      setBannerSlides((prev) =>
        prev.map((s, i) => (i === slideIndex ? { ...s, imageUrl } : s))
      );
      setMsg("Image uploaded. Save banners to publish to users.");
    } catch (err) {
      setErr(getErrorMessage(err, "Upload failed"));
    } finally {
      setBannerUploadingIndex(null);
      e.target.value = "";
    }
  };

  const updateBannerSlide = (index: number, patch: Partial<HomeBannerSlide>) => {
    setBannerSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const addBannerSlide = () => {
    if (bannerSlides.length >= 10) return;
    setBannerSlides((prev) => [
      ...prev,
      { id: `slide-${Date.now()}`, title: "", message: "", imageUrl: "" },
    ]);
  };

  const removeBannerSlide = (index: number) => {
    setBannerSlides((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const saveSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (smsEnabled && !smsApiKey && !smsConfigured) {
      setErr("Enter apihome.in API key before enabling SMS");
      return;
    }
    setErr("");
    setMsg("");
    try {
      const updated = await adminApi.updateSmsSettings({
        enabled: smsEnabled,
        apiKey: smsApiKey || undefined,
        clearApiKey: false,
        currentPassword: smsPassword,
      });
      setSmsEnabled(updated.enabled);
      setSmsConfigured(updated.configured);
      setSmsKeyMasked(updated.apiKeyMasked);
      setSmsApiKey("");
      setSmsPassword("");
      setMsg("SMS settings saved. OTP is sent only from the server — API key is never exposed to users.");
    } catch (err) {
      setErr(getErrorMessage(err));
    }
  };

  const clearSmsKey = async () => {
    if (!smsPassword) {
      setErr("Enter current password to remove API key");
      return;
    }
    setErr("");
    try {
      const updated = await adminApi.updateSmsSettings({
        enabled: false,
        clearApiKey: true,
        currentPassword: smsPassword,
      });
      setSmsEnabled(updated.enabled);
      setSmsConfigured(updated.configured);
      setSmsKeyMasked("");
      setSmsApiKey("");
      setSmsPassword("");
      setMsg("SMS API key removed and OTP SMS disabled.");
    } catch (err) {
      setErr(getErrorMessage(err));
    }
  };

  const taskPreset = (taskType: NewbieRewardTaskType): Partial<NewbieRewardItem> => {
    switch (taskType) {
      case "TELEGRAM_JOIN":
        return {
          title: "Join Telegram channel",
          description: "Join our official Telegram and claim reward.",
          icon: "📢",
          ctaLabel: "Join channel",
          ctaPath: "",
        };
      case "BANK_ACCOUNT":
        return {
          title: "Add bank account",
          description: "Link bank/UPI for withdrawals.",
          icon: "🏦",
          ctaLabel: "Add bank",
          ctaPath: "/profile/bank",
        };
      case "PIN_SET":
        return {
          title: "Set security PIN",
          description: "Create 4-digit PIN in profile.",
          icon: "🔐",
          ctaLabel: "Set PIN",
          ctaPath: "/profile",
        };
      case "FIRST_DEPOSIT":
        return {
          title: "First deposit",
          description: "First approved deposit bonus.",
          icon: "💰",
          ctaLabel: "Buy plan",
          ctaPath: "/deposits",
        };
      default:
        return { icon: "🎁", ctaLabel: "Go", ctaPath: "/deposits" };
    }
  };

  const updateRewardItem = (index: number, patch: Partial<NewbieRewardItem>) => {
    setRewardItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };
        if (patch.taskType && patch.taskType !== item.taskType) {
          return { ...next, ...taskPreset(patch.taskType) };
        }
        return next;
      })
    );
  };

  const addRewardItem = () => {
    if (rewardItems.length >= 12) return;
    setRewardItems((prev) => [
      ...prev,
      {
        id: `reward-${Date.now()}`,
        taskType: "CUSTOM",
        title: "",
        description: "",
        icon: "🎁",
        amountInr: 0,
        telegramUrl: "",
        ctaLabel: "Go",
        ctaPath: "/deposits",
        sortOrder: prev.length,
      },
    ]);
  };

  const removeRewardItem = (index: number) => {
    setRewardItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const saveRewards = async (e: React.FormEvent) => {
    e.preventDefault();
    const filled = rewardItems.filter((item) => item.title.trim() || item.description.trim());
    if (rewardsEnabled && filled.length === 0) {
      setErr("Add at least one reward with title or description");
      return;
    }
    if (rewardsEnabled && filled.some((item) => !item.amountInr || item.amountInr <= 0)) {
      setErr("Each reward needs a positive ₹ amount");
      return;
    }
    if (
      rewardsEnabled &&
      filled.some((item) => item.taskType === "TELEGRAM_JOIN" && !item.telegramUrl.trim())
    ) {
      setErr("Telegram rewards need a channel URL");
      return;
    }
    setErr("");
    setMsg("");
    try {
      const updated = await adminApi.updateNewbieRewards({
        enabled: rewardsEnabled,
        title: rewardsTitle.trim() || "Newbie Rewards",
        subtitle: rewardsSubtitle.trim(),
        items: filled,
        currentPassword: rewardsPassword,
      });
      setRewardsEnabled(updated.enabled);
      setRewardsTitle(updated.title);
      setRewardsSubtitle(updated.subtitle);
      setRewardItems(updated.items);
      setRewardsPassword("");
      setMsg("Newbie rewards page saved. Home card links to /rewards for users.");
    } catch (err) {
      setErr(getErrorMessage(err));
    }
  };

  const onPromoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPromoUploading(true);
    setErr("");
    try {
      const { imageUrl } = await adminApi.uploadHomePromoImage(file);
      setPromoImageUrl(imageUrl);
      setMsg("Promo image uploaded. Save to publish on home.");
    } catch (err) {
      setErr(getErrorMessage(err, "Upload failed"));
    } finally {
      setPromoUploading(false);
      e.target.value = "";
    }
  };

  const savePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (promoEnabled && !promoImageUrl.trim()) {
      setErr("Upload a promo image or disable the strip");
      return;
    }
    setErr("");
    setMsg("");
    try {
      const updated = await adminApi.updateHomePromo({
        enabled: promoEnabled,
        imageUrl: promoImageUrl.trim(),
        linkUrl: promoLinkUrl.trim(),
        currentPassword: promoPassword,
      });
      setPromoEnabled(updated.enabled);
      setPromoImageUrl(updated.imageUrl);
      setPromoLinkUrl(updated.linkUrl);
      setPromoPassword("");
      setMsg("Home promo strip saved (below Deposit / Withdrawal on user home).");
    } catch (err) {
      setErr(getErrorMessage(err));
    }
  };

  const saveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const filled = bannerSlides.filter((s) => s.title || s.message || s.imageUrl);
    if (bannerEnabled && filled.length === 0) {
      setErr("Add at least one banner with title, message, or image");
      return;
    }
    setErr("");
    setMsg("");
    try {
      await adminApi.updateHomeBanner({
        enabled: bannerEnabled,
        slides: filled,
        currentPassword: bannerPassword,
      });
      setBannerPassword("");
      setMsg("Home banner slider saved. Users will see slides on the home screen.");
    } catch (err) {
      setErr(getErrorMessage(err));
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErr("New passwords do not match");
      return;
    }
    setErr("");
    setMsg("");
    try {
      await adminApi.changePassword(pwdCurrent, newPassword);
      setMsg("New password saved to database.");
      setPwdCurrent("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyTitle.trim()) {
      setErr("Notification title is required");
      return;
    }
    setErr("");
    setMsg("");
    setSendingNotify(true);
    try {
      await adminApi.sendNotification({
        title: notifyTitle.trim(),
        body: notifyBody.trim() || undefined,
        userId: notifyUserId.trim() || undefined,
      });
      setNotifyTitle("");
      setNotifyBody("");
      setNotifyUserId("");
      setMsg("Notification sent to user app.");
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setSendingNotify(false);
    }
  };

  if (!profile) return <LoadingBlock label="Loading settings" />;

  return (
    <div className="animate-fade-in max-w-2xl">
      <PageHeader title="Settings" description="Update account — saved securely in MongoDB" />
      {msg && <Alert variant="success">{msg}</Alert>}
      {err && <Alert variant="error">{err}</Alert>}

      <Card className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <UserCog size={20} />
          </div>
          <SectionTitle>Account</SectionTitle>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <Label>Email (login)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Current password (required to save)</Label>
            <Input type="password" value={profilePassword} onChange={(e) => setProfilePassword(e.target.value)} required />
          </div>
          <Button type="submit">Save account</Button>
        </form>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Coins size={20} />
          </div>
          <SectionTitle>Home rates &amp; bonus</SectionTitle>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          USDT rate is used for crypto deposits. Minimum USDT applies to custom crypto orders and fixed crypto plans.
          Today&apos;s INR bonus % is shown on the user home screen.
          Example: 10 USDT × ₹{usdtToInrRate || "—"} = ₹
          {usdtToInrRate ? (Number(usdtToInrRate) * 10).toFixed(2) : "—"} base credit.
        </p>
        <form onSubmit={saveRate} className="space-y-4">
          <div>
            <Label>1 USDT = ₹ (INR) — today&apos;s rate</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={usdtToInrRate}
              onChange={(e) => setUsdtToInrRate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Minimum USDT deposit quantity</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={minUsdtDeposit}
              onChange={(e) => setMinUsdtDeposit(e.target.value)}
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Users cannot create a crypto deposit below this amount (custom USDT calculator and crypto plans).
            </p>
          </div>
          <div>
            <Label>Today&apos;s INR bonus (%)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={todayInrBonusPercent}
              onChange={(e) => setTodayInrBonusPercent(e.target.value)}
              required
            />
            <p className="text-xs text-slate-500 mt-1">e.g. 5 = 5% extra shown on user home for INR deposits.</p>
          </div>
          <div>
            <Label>Team referral commission (%)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={referralCommissionPercent}
              onChange={(e) => setReferralCommissionPercent(e.target.value)}
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              When a referred user&apos;s deposit is approved, referrer gets this % of wallet credit (e.g. 5% of ₹1000 = ₹50).
            </p>
          </div>
          <div>
            <Label>Current password (required to save)</Label>
            <Input type="password" value={ratePassword} onChange={(e) => setRatePassword(e.target.value)} required />
          </div>
          <Button type="submit">Save home settings</Button>
        </form>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Smartphone size={20} />
          </div>
          <SectionTitle>SMS OTP (apihome.in)</SectionTitle>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Signup OTP is sent only from the backend using your apihome.in bulk SMS key. The key is stored in the database
          and never shown in the user app. Limits: 60s between resends, max 3/hour and 5/day per mobile.
        </p>
        <form onSubmit={saveSms} className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={smsEnabled}
              onChange={(e) => setSmsEnabled(e.target.checked)}
              className="rounded border-slate-300 text-brand-600"
            />
            Enable OTP SMS (production)
          </label>
          {smsConfigured && smsKeyMasked && (
            <p className="text-xs text-slate-500 font-mono">Current key: {smsKeyMasked}</p>
          )}
          <div>
            <Label>apihome.in API key</Label>
            <Input
              type="password"
              value={smsApiKey}
              onChange={(e) => setSmsApiKey(e.target.value)}
              placeholder={smsConfigured ? "Leave blank to keep existing key" : "Paste API key from apihome panel"}
              autoComplete="off"
            />
          </div>
          <div>
            <Label>Current password (required to save)</Label>
            <Input type="password" value={smsPassword} onChange={(e) => setSmsPassword(e.target.value)} required />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Save SMS settings</Button>
            {smsConfigured && (
              <Button type="button" variant="secondary" onClick={() => void clearSmsKey()}>
                Remove API key
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Megaphone size={20} />
          </div>
          <SectionTitle>Home promo strip (below Deposit / Withdrawal)</SectionTitle>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Small wide banner under the deposit &amp; withdrawal card — e.g. referral / commission promo. Upload a
          compact image (recommended height ~80–120px).
        </p>
        <form onSubmit={savePromo} className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={promoEnabled}
              onChange={(e) => setPromoEnabled(e.target.checked)}
              className="rounded border-slate-300 text-brand-600"
            />
            Show promo strip on home
          </label>
          <div>
            <Label>Promo image</Label>
            <Input type="file" accept="image/*" onChange={(e) => void onPromoFile(e)} disabled={promoUploading} />
            <Input
              value={promoImageUrl}
              onChange={(e) => setPromoImageUrl(e.target.value)}
              placeholder="/uploads/home-promo/…"
              className="mt-2 font-mono text-xs"
            />
          </div>
          {promoImageUrl && (
            <img
              src={promoImageUrl.startsWith("http") ? promoImageUrl : promoImageUrl}
              alt="Preview"
              className="max-h-24 w-full object-cover rounded-xl border"
            />
          )}
          <div>
            <Label>Tap link (optional)</Label>
            <Input
              value={promoLinkUrl}
              onChange={(e) => setPromoLinkUrl(e.target.value)}
              placeholder="/team or https://t.me/…"
            />
          </div>
          <div>
            <Label>Current password (required to save)</Label>
            <Input type="password" value={promoPassword} onChange={(e) => setPromoPassword(e.target.value)} required />
          </div>
          <Button type="submit" disabled={promoUploading}>
            {promoUploading ? "Uploading…" : "Save home promo"}
          </Button>
        </form>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center">
            <Gift size={20} />
          </div>
          <SectionTitle>Newbie rewards page (user app)</SectionTitle>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Set tasks and <strong>₹ reward amount</strong> for each. Users claim once per task; verified tasks (bank, PIN,
          first deposit) auto-check. Telegram uses honor system (user joins then claims).
        </p>
        <form onSubmit={saveRewards} className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={rewardsEnabled}
              onChange={(e) => setRewardsEnabled(e.target.checked)}
              className="rounded border-slate-300 text-brand-600"
            />
            Enable newbie rewards page
          </label>
          <div>
            <Label>Page title</Label>
            <Input value={rewardsTitle} onChange={(e) => setRewardsTitle(e.target.value)} placeholder="Newbie Rewards" />
          </div>
          <div>
            <Label>Subtitle</Label>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm min-h-[72px] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              value={rewardsSubtitle}
              onChange={(e) => setRewardsSubtitle(e.target.value)}
              placeholder="Exclusive offers for new members…"
            />
          </div>
          {rewardItems.map((item, index) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Reward {index + 1}</p>
                {rewardItems.length > 1 && (
                  <Button type="button" variant="secondary" onClick={() => removeRewardItem(index)}>
                    Remove
                  </Button>
                )}
              </div>
              <div>
                <Label>Task type</Label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white"
                  value={item.taskType}
                  onChange={(e) =>
                    updateRewardItem(index, { taskType: e.target.value as NewbieRewardTaskType })
                  }
                >
                  {REWARD_TASK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Reward amount (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={item.amountInr}
                    onChange={(e) => updateRewardItem(index, { amountInr: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label>Sort order</Label>
                  <Input
                    type="number"
                    min="0"
                    value={item.sortOrder}
                    onChange={(e) => updateRewardItem(index, { sortOrder: Number(e.target.value) })}
                  />
                </div>
              </div>
              {item.taskType === "TELEGRAM_JOIN" && (
                <div>
                  <Label>Telegram channel URL</Label>
                  <Input
                    value={item.telegramUrl}
                    onChange={(e) => updateRewardItem(index, { telegramUrl: e.target.value })}
                    placeholder="https://t.me/yourchannel"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Icon (emoji)</Label>
                  <Input value={item.icon} onChange={(e) => updateRewardItem(index, { icon: e.target.value })} maxLength={4} />
                </div>
                <div>
                  <Label>Button label (when locked)</Label>
                  <Input
                    value={item.ctaLabel}
                    onChange={(e) => updateRewardItem(index, { ctaLabel: e.target.value })}
                    placeholder="Complete task"
                  />
                </div>
              </div>
              <div>
                <Label>Title</Label>
                <Input value={item.title} onChange={(e) => updateRewardItem(index, { title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <textarea
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm min-h-[64px] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  value={item.description}
                  onChange={(e) => updateRewardItem(index, { description: e.target.value })}
                />
              </div>
              {item.taskType !== "TELEGRAM_JOIN" && (
                <div>
                  <Label>App link (when task not done)</Label>
                  <Input
                    value={item.ctaPath}
                    onChange={(e) => updateRewardItem(index, { ctaPath: e.target.value })}
                    placeholder="/profile/bank"
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-slate-400 mt-1">/profile/bank, /profile, /deposits, /team</p>
                </div>
              )}
            </div>
          ))}
          {rewardItems.length < 12 && (
            <Button type="button" variant="secondary" onClick={addRewardItem}>
              Add reward
            </Button>
          )}
          <div>
            <Label>Current password (required to save)</Label>
            <Input type="password" value={rewardsPassword} onChange={(e) => setRewardsPassword(e.target.value)} required />
          </div>
          <Button type="submit">Save newbie rewards</Button>
        </form>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Megaphone size={20} />
          </div>
          <SectionTitle>Home banner slider (user app)</SectionTitle>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Slides appear at the top of Home. Users can swipe the carousel; tapping a slide opens a bottom drawer with full
          details. Add up to 10 slides.
        </p>
        <form onSubmit={saveBanner} className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={bannerEnabled}
              onChange={(e) => setBannerEnabled(e.target.checked)}
              className="rounded border-slate-300 text-brand-600"
            />
            Enable banner slider on home
          </label>
          {bannerSlides.map((slide, index) => (
            <div key={slide.id} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Slide {index + 1}</p>
                {bannerSlides.length > 1 && (
                  <Button type="button" variant="secondary" onClick={() => removeBannerSlide(index)}>
                    Remove
                  </Button>
                )}
              </div>
              <div>
                <Label>Title (optional)</Label>
                <Input
                  value={slide.title}
                  onChange={(e) => updateBannerSlide(index, { title: e.target.value })}
                  placeholder="Welcome offer"
                />
              </div>
              <div>
                <Label>Message (optional)</Label>
                <textarea
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  value={slide.message}
                  onChange={(e) => updateBannerSlide(index, { message: e.target.value })}
                  placeholder="Your announcement text…"
                />
              </div>
              <div>
                <Label>Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void onBannerFile(index, e)}
                  disabled={bannerUploadingIndex === index}
                  className="text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">Or paste image URL</p>
                <Input
                  value={slide.imageUrl}
                  onChange={(e) => updateBannerSlide(index, { imageUrl: e.target.value })}
                  placeholder="/uploads/home-banner/… or https://…"
                  className="mt-2 font-mono text-xs"
                />
              </div>
              {slide.imageUrl && (
                <img
                  src={slide.imageUrl.startsWith("http") ? slide.imageUrl : slide.imageUrl}
                  alt="Preview"
                  className="max-h-32 rounded-xl border object-contain bg-white"
                />
              )}
            </div>
          ))}
          {bannerSlides.length < 10 && (
            <Button type="button" variant="secondary" onClick={addBannerSlide}>
              Add slide
            </Button>
          )}
          <div>
            <Label>Current password (required to save)</Label>
            <Input type="password" value={bannerPassword} onChange={(e) => setBannerPassword(e.target.value)} required />
          </div>
          <Button type="submit" disabled={bannerUploadingIndex !== null}>
            {bannerUploadingIndex !== null ? "Uploading…" : "Save home banners"}
          </Button>
        </form>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BellRing size={20} />
          </div>
          <SectionTitle>User notifications</SectionTitle>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Send notification to all users or a specific user. User app top bar bell icon will show unread highlight.
        </p>
        <form onSubmit={sendNotification} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={notifyTitle}
              onChange={(e) => setNotifyTitle(e.target.value)}
              placeholder="Payment update available"
              required
            />
          </div>
          <div>
            <Label>Message (optional)</Label>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm min-h-[90px] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              value={notifyBody}
              onChange={(e) => setNotifyBody(e.target.value)}
              placeholder="We have updated your payout status..."
            />
          </div>
          <div>
            <Label>User ID (optional)</Label>
            <Input
              value={notifyUserId}
              onChange={(e) => setNotifyUserId(e.target.value)}
              placeholder="Leave blank to broadcast to all users"
              className="font-mono text-xs"
            />
          </div>
          <Button type="submit" disabled={sendingNotify}>
            {sendingNotify ? "Sending…" : "Send notification"}
          </Button>
        </form>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <KeyRound size={20} />
          </div>
          <SectionTitle>Change password</SectionTitle>
        </div>
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <Label>Current password</Label>
            <Input type="password" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} required />
          </div>
          <div>
            <Label>New password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
          </div>
          <div>
            <Label>Confirm new password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" variant="secondary">
            Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}

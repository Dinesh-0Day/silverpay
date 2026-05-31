/** Decorative 3D-style icons for home balance / commission cards */

export function HomeWalletIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="32" cy="54" rx="22" ry="4" fill="#000" opacity="0.08" />
      <rect x="10" y="18" width="44" height="32" rx="8" fill="url(#walletBody)" />
      <rect x="10" y="18" width="44" height="14" rx="8" fill="url(#walletFlap)" />
      <rect x="36" y="30" width="16" height="12" rx="4" fill="url(#walletPocket)" />
      <circle cx="44" cy="36" r="3.5" fill="#FCD34D" stroke="#D97706" strokeWidth="1" />
      <defs>
        <linearGradient id="walletBody" x1="10" y1="18" x2="54" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4ADE80" />
          <stop offset="1" stopColor="#16A34A" />
        </linearGradient>
        <linearGradient id="walletFlap" x1="10" y1="18" x2="54" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#86EFAC" />
          <stop offset="1" stopColor="#22C55E" />
        </linearGradient>
        <linearGradient id="walletPocket" x1="36" y1="30" x2="52" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#15803D" />
          <stop offset="1" stopColor="#166534" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function HomeGiftIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="32" cy="56" rx="20" ry="3.5" fill="#000" opacity="0.07" />
      <rect x="14" y="28" width="36" height="24" rx="4" fill="url(#giftBox)" />
      <rect x="30" y="28" width="4" height="24" fill="#22C55E" />
      <rect x="14" y="38" width="36" height="4" fill="#22C55E" />
      <path
        d="M32 28c-6-8-14-6-14 2 0 5 6 6 14 0 8-6 14-7 14-2 0-8-8-10-14-2Z"
        fill="url(#giftBow)"
      />
      <circle cx="22" cy="20" r="5" fill="#FB923C" opacity="0.9" />
      <circle cx="42" cy="20" r="5" fill="#FB923C" opacity="0.9" />
      <defs>
        <linearGradient id="giftBox" x1="14" y1="28" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F1F5F9" />
        </linearGradient>
        <linearGradient id="giftBow" x1="18" y1="14" x2="46" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDBA74" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
      </defs>
    </svg>
  );
}

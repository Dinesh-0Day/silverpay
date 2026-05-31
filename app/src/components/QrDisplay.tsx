import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrDisplay({ value, label }: { value: string; label?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setSrc(null);
      return;
    }
    QRCode.toDataURL(value, { width: 220, margin: 2 }).then(setSrc).catch(() => setSrc(null));
  }, [value]);

  if (!src) return null;

  return (
    <div className="flex flex-col items-center">
      {label && <p className="text-xs text-slate-500 mb-2">{label}</p>}
      <img src={src} alt="QR code" className="w-52 h-52 rounded-xl border border-slate-200 bg-white p-2" />
    </div>
  );
}

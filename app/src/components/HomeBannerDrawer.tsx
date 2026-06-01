import { useEffect } from "react";
import type { HomeBannerSlide } from "../api";
import { resolveMediaUrl } from "../lib/apiBase";

type Props = {
  slide: HomeBannerSlide;
  onClose: () => void;
};

export default function HomeBannerDrawer({ slide, onClose }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const imageSrc = slide.imageUrl ? resolveMediaUrl(slide.imageUrl) : "";

  return (
    <div className="home-banner-drawer-backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-banner-drawer-title"
        className="home-banner-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="home-banner-drawer-handle" aria-hidden />
        {imageSrc && (
          <div className="home-banner-drawer-image-wrap">
            <img src={imageSrc} alt="" className="home-banner-drawer-image" />
          </div>
        )}
        <div className="home-banner-drawer-body">
          {slide.title && (
            <h2 id="home-banner-drawer-title" className="text-lg font-bold text-slate-900 mb-2">
              {slide.title}
            </h2>
          )}
          {slide.message && (
            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{slide.message}</p>
          )}
          {!slide.title && !slide.message && imageSrc && (
            <p className="text-sm text-slate-500 text-center">Announcement from SilverPay</p>
          )}
        </div>
        <button type="button" onClick={onClose} className="home-banner-drawer-close">
          Close
        </button>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import type { HomeBannerSlide } from "../api";
import { resolveMediaUrl } from "../lib/apiBase";

type Props = {
  slides: HomeBannerSlide[];
  onSlideClick: (slide: HomeBannerSlide) => void;
};

export default function HomeBannerSlider({ slides, onSlideClick }: Props) {
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIndex(0);
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const slide = el.children[index] as HTMLElement | undefined;
    if (!slide) return;
    // Scroll only the banner track — never scrollIntoView (it jumps the whole page).
    el.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
  }, [index]);

  if (!slides.length) return null;

  return (
    <div className="home-banner-slider">
      <div ref={trackRef} className="home-banner-track">
        {slides.map((slide) => {
          const imageSrc = slide.imageUrl ? resolveMediaUrl(slide.imageUrl) : "";
          return (
            <button
              key={slide.id}
              type="button"
              className="home-banner-slide"
              onClick={() => onSlideClick(slide)}
            >
              {imageSrc ? (
                <img src={imageSrc} alt={slide.title || "Promotion"} className="home-banner-slide-img" />
              ) : (
                <div className="home-banner-slide-fallback">
                  {slide.title && <p className="home-banner-slide-title">{slide.title}</p>}
                  {slide.message && <p className="home-banner-slide-msg">{slide.message}</p>}
                  {!slide.title && !slide.message && <p className="home-banner-slide-title">SilverPay</p>}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {slides.length > 1 && (
        <div className="home-banner-dots">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              className={`home-banner-dot${i === index ? " is-active" : ""}`}
              aria-label={`Banner ${i + 1}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

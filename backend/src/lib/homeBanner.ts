import { randomBytes } from "crypto";
import { AppSettings } from "../models/index.js";

const SETTINGS_KEY = "global";

export type HomeBannerSlide = {
  id: string;
  title: string;
  message: string;
  imageUrl: string;
};

export type HomeBannerPayload = {
  enabled: boolean;
  title: string;
  message: string;
  imageUrl: string;
  revision: number;
  slides: HomeBannerSlide[];
};

function slideHasContent(slide: HomeBannerSlide) {
  return Boolean(slide.title || slide.message || slide.imageUrl);
}

function legacySlide(doc: {
  homeBannerTitle?: string;
  homeBannerMessage?: string;
  homeBannerImageUrl?: string;
}): HomeBannerSlide | null {
  const title = doc.homeBannerTitle?.trim() ?? "";
  const message = doc.homeBannerMessage?.trim() ?? "";
  const imageUrl = doc.homeBannerImageUrl?.trim() ?? "";
  if (!title && !message && !imageUrl) return null;
  return { id: "legacy", title, message, imageUrl };
}

function normalizeSlides(raw: HomeBannerSlide[] | undefined | null): HomeBannerSlide[] {
  if (!raw?.length) return [];
  return raw
    .map((s) => ({
      id: s.id?.trim() || newSlideId(),
      title: s.title?.trim() ?? "",
      message: s.message?.trim() ?? "",
      imageUrl: s.imageUrl?.trim() ?? "",
    }))
    .filter(slideHasContent);
}

export function newSlideId() {
  return randomBytes(6).toString("hex");
}

async function readSettingsDoc() {
  return AppSettings.findOne({ key: SETTINGS_KEY });
}

export async function getHomeBanner(): Promise<HomeBannerPayload> {
  const doc = await readSettingsDoc();
  const stored = normalizeSlides(doc?.homeBannerSlides as HomeBannerSlide[] | undefined);
  const slides = stored.length > 0 ? stored : legacySlide(doc ?? {}) ? [legacySlide(doc ?? {})!] : [];
  const first = slides[0];
  return {
    enabled: Boolean(doc?.homeBannerEnabled),
    title: first?.title ?? doc?.homeBannerTitle?.trim() ?? "",
    message: first?.message ?? doc?.homeBannerMessage?.trim() ?? "",
    imageUrl: first?.imageUrl ?? doc?.homeBannerImageUrl?.trim() ?? "",
    revision: doc?.homeBannerRevision ?? 0,
    slides,
  };
}

export async function getHomeBannerSlidesForUser(): Promise<{ enabled: boolean; revision: number; slides: HomeBannerSlide[] }> {
  const banner = await getHomeBanner();
  return {
    enabled: banner.enabled,
    revision: banner.revision,
    slides: banner.enabled ? banner.slides : [],
  };
}

async function persistSlides(slides: HomeBannerSlide[], bumpRevision: boolean) {
  const existing = await readSettingsDoc();
  const nextRevision =
    bumpRevision === true ? (existing?.homeBannerRevision ?? 0) + 1 : (existing?.homeBannerRevision ?? 0);
  const first = slides[0];
  await AppSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    {
      homeBannerRevision: nextRevision,
      homeBannerSlides: slides,
      homeBannerTitle: first?.title ?? "",
      homeBannerMessage: first?.message ?? "",
      homeBannerImageUrl: first?.imageUrl ?? "",
    },
    { upsert: true, new: true }
  );
  return getHomeBanner();
}

export async function updateHomeBanner(input: {
  enabled?: boolean;
  title?: string;
  message?: string;
  imageUrl?: string;
  slides?: HomeBannerSlide[];
  bumpRevision?: boolean;
}) {
  const existing = await readSettingsDoc();
  const bump = input.bumpRevision === true;

  if (input.slides !== undefined) {
    const slides = normalizeSlides(input.slides);
    const update: Record<string, unknown> = {};
    if (input.enabled !== undefined) update.homeBannerEnabled = input.enabled;
    if (Object.keys(update).length) {
      await AppSettings.findOneAndUpdate({ key: SETTINGS_KEY }, update, { upsert: true });
    }
    return persistSlides(slides, bump);
  }

  const current = await getHomeBanner();
  const slide: HomeBannerSlide = {
    id: current.slides[0]?.id ?? newSlideId(),
    title: input.title !== undefined ? input.title : current.title,
    message: input.message !== undefined ? input.message : current.message,
    imageUrl: input.imageUrl !== undefined ? input.imageUrl : current.imageUrl,
  };
  const slides = slideHasContent(slide) ? [slide] : [];

  if (input.enabled !== undefined) {
    await AppSettings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { homeBannerEnabled: input.enabled },
      { upsert: true }
    );
  }

  if (bump && !input.enabled && slides.length === 0 && !input.title && !input.message && !input.imageUrl) {
    const nextRevision = (existing?.homeBannerRevision ?? 0) + 1;
    await AppSettings.findOneAndUpdate({ key: SETTINGS_KEY }, { homeBannerRevision: nextRevision }, { upsert: true });
    return getHomeBanner();
  }

  return persistSlides(slides.length ? slides : current.slides, bump);
}

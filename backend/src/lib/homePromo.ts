import { AppSettings } from "../models/index.js";

const SETTINGS_KEY = "global";

export type HomePromoPayload = {
  enabled: boolean;
  imageUrl: string;
  linkUrl: string;
};

export async function getHomePromo(): Promise<HomePromoPayload> {
  const doc = await AppSettings.findOne({ key: SETTINGS_KEY });
  return {
    enabled: Boolean(doc?.homePromoEnabled),
    imageUrl: doc?.homePromoImageUrl?.trim() ?? "",
    linkUrl: doc?.homePromoLinkUrl?.trim() ?? "",
  };
}

export async function updateHomePromo(input: {
  enabled?: boolean;
  imageUrl?: string;
  linkUrl?: string;
}) {
  const patch: Record<string, unknown> = {};
  if (input.enabled !== undefined) patch.homePromoEnabled = input.enabled;
  if (input.imageUrl !== undefined) patch.homePromoImageUrl = input.imageUrl.trim();
  if (input.linkUrl !== undefined) patch.homePromoLinkUrl = input.linkUrl.trim();
  await AppSettings.findOneAndUpdate({ key: SETTINGS_KEY }, patch, { upsert: true, new: true });
  return getHomePromo();
}

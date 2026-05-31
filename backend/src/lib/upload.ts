import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.join(__dirname, "../../uploads");
export const HOME_BANNER_DIR = path.join(UPLOADS_DIR, "home-banner");
export const HOME_PROMO_DIR = path.join(UPLOADS_DIR, "home-promo");

for (const dir of [UPLOADS_DIR, HOME_BANNER_DIR, HOME_PROMO_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, HOME_BANNER_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const safe = ext.match(/^\.(jpe?g|png|gif|webp)$/) ? ext : ".jpg";
    cb(null, `banner-${Date.now()}${safe}`);
  },
});

const promoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, HOME_PROMO_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const safe = ext.match(/^\.(jpe?g|png|gif|webp)$/) ? ext : ".jpg";
    cb(null, `promo-${Date.now()}${safe}`);
  },
});

export const homeBannerUpload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const homePromoUpload = multer({
  storage: promoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

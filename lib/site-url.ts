const FALLBACK_SITE_URL = "https://neurocity-fhl1.onrender.com";

export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.RENDER_EXTERNAL_URL?.trim();
  try {
    return new URL(configured || FALLBACK_SITE_URL).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export async function GET() {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim();
  return Response.json({ enabled: Boolean(siteKey), siteKey: siteKey || null }, { headers: { "cache-control": "no-store" } });
}

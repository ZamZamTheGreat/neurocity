import { resolvePlatformTenant } from "../../../lib/platform-tenant";

export async function GET(request: Request) {
  try {
    const platform = await resolvePlatformTenant(request);
    return Response.json({ platform }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("platform tenant resolution failed", error);
    return Response.json({ error: "Platform configuration is unavailable." }, { status: 503 });
  }
}

import { resolvePlatformTenant } from "../../../lib/platform-tenant";
import { publicCacheHeaders } from "../../../lib/server-cache";

export async function GET(request: Request) {
  try {
    const platform = await resolvePlatformTenant(request);
    return Response.json({ platform }, { headers: publicCacheHeaders(60, 300) });
  } catch (error) {
    console.error("platform tenant resolution failed", error);
    return Response.json({ error: "Platform configuration is unavailable." }, { status: 503 });
  }
}

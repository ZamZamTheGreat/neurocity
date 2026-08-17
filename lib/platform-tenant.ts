import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { platformTenantDomains, platformTenants } from "../db/schema";

export type PublicPlatformTenant = {
  id: number;
  name: string;
  slug: string;
  kind: string;
  country: string;
  city: string | null;
  tagline: string | null;
  logoUrl: string | null;
  markUrl: string | null;
  theme: Record<string, unknown>;
  features: Record<string, unknown>;
};

const normalizeHostname = (value: string | null) => (value ?? "").split(":")[0].trim().toLowerCase();

export async function resolvePlatformTenant(request: Request): Promise<PublicPlatformTenant> {
  const db = getDb();
  const previewSlug = new URL(request.url).searchParams.get("mall")?.trim().toLowerCase();
  const hostname = normalizeHostname(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  let tenant;
  if (previewSlug) [tenant] = await db.select().from(platformTenants).where(eq(platformTenants.slug, previewSlug)).limit(1);
  if (hostname) {
    if (!tenant) { const [domainMatch] = await db.select({ tenant: platformTenants }).from(platformTenantDomains).innerJoin(platformTenants, eq(platformTenantDomains.tenantId, platformTenants.id)).where(eq(platformTenantDomains.hostname, hostname)).limit(1); tenant = domainMatch?.tenant; }
  }
  if (!tenant) [tenant] = await db.select().from(platformTenants).where(eq(platformTenants.slug, "neurocity")).limit(1);
  if (!tenant) throw new Error("No active platform tenant is configured.");
  return { id: tenant.id, name: tenant.name, slug: tenant.slug, kind: tenant.kind, country: tenant.country, city: tenant.city, tagline: tenant.tagline, logoUrl: tenant.logoUrl, markUrl: tenant.markUrl, theme: tenant.theme as Record<string, unknown>, features: tenant.features as Record<string, unknown> };
}

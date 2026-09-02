import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  merchantMemberships,
  merchants,
  platformTenantMemberships,
  platformTenants,
} from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user)
    return Response.json(
      { authenticated: false, merchantAccounts: [], mallAccounts: [] },
      { headers: { "cache-control": "no-store" } },
    );

  const db = getDb();
  const [merchantAccounts, mallAccounts] = await Promise.all([
    db
      .select({
        id: merchantMemberships.id,
        merchantId: merchants.id,
        name: merchants.name,
        slug: merchants.slug,
        role: merchantMemberships.role,
      })
      .from(merchantMemberships)
      .innerJoin(merchants, eq(merchants.id, merchantMemberships.merchantId))
      .where(
        and(
          eq(merchantMemberships.userRef, user.userId),
          eq(merchantMemberships.status, "active"),
          inArray(merchants.status, ["pilot", "onboarding", "active"]),
        ),
      ),
    db
      .select({
        id: platformTenantMemberships.id,
        tenantId: platformTenants.id,
        name: platformTenants.name,
        slug: platformTenants.slug,
        role: platformTenantMemberships.role,
      })
      .from(platformTenantMemberships)
      .innerJoin(
        platformTenants,
        eq(platformTenants.id, platformTenantMemberships.tenantId),
      )
      .where(
        and(
          eq(platformTenantMemberships.userId, Number(user.userId)),
          eq(platformTenantMemberships.status, "active"),
          eq(platformTenants.status, "active"),
        ),
      ),
  ]);

  return Response.json(
    {
      authenticated: true,
      user: {
        displayName: user.displayName,
        email: user.email,
        platformRole: user.platformRole,
      },
      merchantAccounts,
      mallAccounts,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

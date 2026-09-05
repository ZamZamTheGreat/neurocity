import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { customerAddresses, customerCartItems, customerCompanionProfiles, customerSavedStores, customerWishlists, dataSubjectRequests, orders, serviceBookings, users } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { PRIVACY_NOTICE_VERSION } from "../../../../lib/privacy";

export async function GET() {
  const auth = await getChatGPTUser();
  if (!auth) return Response.json({ error: "Sign in required." }, { status: 401, headers: { "cache-control": "no-store" } });
  const db = getDb();
  const userId = Number(auth.userId);
  const [account, addresses, cart, wishlist, stores, purchases, bookings, companion, requests] = await Promise.all([
    db.select({ email: users.email, displayName: users.displayName, status: users.status, createdAt: users.createdAt, privacyNoticeVersion: users.privacyNoticeVersion, privacyAcceptedAt: users.privacyAcceptedAt, termsVersion: users.termsVersion, termsAcceptedAt: users.termsAcceptedAt }).from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(customerAddresses).where(eq(customerAddresses.userId, userId)),
    db.select().from(customerCartItems).where(eq(customerCartItems.userId, userId)),
    db.select().from(customerWishlists).where(eq(customerWishlists.userId, userId)),
    db.select().from(customerSavedStores).where(eq(customerSavedStores.userId, userId)),
    db.select().from(orders).where(eq(orders.customerRef, auth.userId)),
    db.select().from(serviceBookings).where(eq(serviceBookings.customerId, userId)),
    db.select().from(customerCompanionProfiles).where(eq(customerCompanionProfiles.userId, userId)),
    db.select().from(dataSubjectRequests).where(eq(dataSubjectRequests.userId, userId)),
  ]);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), noticeVersion: PRIVACY_NOTICE_VERSION, account: account[0] ?? null, addresses, cart, wishlist, savedStores: stores, orders: purchases, serviceBookings: bookings, companionProfile: companion[0] ?? null, privacyRequests: requests }, null, 2);
  return new Response(body, { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="neurocity-data-${new Date().toISOString().slice(0, 10)}.json"`, "cache-control": "no-store, private", pragma: "no-cache" } });
}

export async function DELETE() {
  const auth = await getChatGPTUser();
  if (!auth) return Response.json({ error: "Sign in required." }, { status: 401, headers: { "cache-control": "no-store" } });
  const db = getDb();
  const userId = Number(auth.userId);
  const [existing] = await db.select().from(dataSubjectRequests).where(and(eq(dataSubjectRequests.userId, userId), eq(dataSubjectRequests.requestType, "deletion"), eq(dataSubjectRequests.status, "submitted"))).limit(1);
  if (existing) return Response.json({ ok: true, requestId: existing.id, message: "Your deletion request is already being reviewed." }, { headers: { "cache-control": "no-store" } });
  const [created] = await db.insert(dataSubjectRequests).values({ userId, requestType: "deletion" }).returning();
  return Response.json({ ok: true, requestId: created.id, message: "Deletion request submitted. NeuroCity will review records that must be retained for transactions or legal obligations." }, { status: 201, headers: { "cache-control": "no-store" } });
}

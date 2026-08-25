import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { applicationDocuments, auditEvents, merchantApplications, merchantMemberships, merchants, platformTenantMerchants, platformTenants, users } from "../../../../db/schema";
import { sendMail } from "../../../../lib/mail";
import { createPresignedR2Url } from "../../../../lib/r2";
import { getChatGPTUser } from "../../../chatgpt-auth";

const allowed = new Set(["under_review", "more_information_required", "approved", "rejected"]);
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 180);
const documentViewUrl = (storageKey: string, originalName: string | null) => { try { return createPresignedR2Url("GET", storageKey, 300, `inline; filename="${(originalName ?? "document").replace(/["\\]/g, "-")}"`); } catch { return null; } };

export async function GET() { const user = await getChatGPTUser(); if (user?.platformRole !== "administrator") return Response.json({ error: "Administrator access required." }, { status: 403 }); const db = getDb(); const applications = await db.select().from(merchantApplications).orderBy(desc(merchantApplications.submittedAt)); const merchantList = await db.select().from(merchants).orderBy(desc(merchants.createdAt)); const tenants = await db.select({ id: platformTenants.id, name: platformTenants.name }).from(platformTenants); const documents = applications.length ? await db.select().from(applicationDocuments).where(inArray(applicationDocuments.applicationId, applications.map((item) => item.id))) : []; const withDocuments = applications.map((application) => ({ ...application, targetPlatformName: application.platformTenantId ? tenants.find((tenant) => tenant.id === application.platformTenantId)?.name ?? "Digital mall" : "NeuroCity Marketplace", documents: documents.filter((document) => document.applicationId === application.id).map((document) => ({ ...document, viewUrl: document.status === "uploaded" && document.storageKey ? documentViewUrl(document.storageKey, document.originalName) : null })) })); return Response.json({ applications: withDocuments, merchants: merchantList }); }

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (user?.platformRole !== "administrator") return Response.json({ error: "Administrator access required." }, { status: 403 });
  const { id, status, notes } = await request.json() as { id?: number; status?: string; notes?: string };
  if (!Number.isInteger(id) || !status || !allowed.has(status)) return Response.json({ error: "Valid application and review status required." }, { status: 400 });
  const db = getDb(); const [application] = await db.select().from(merchantApplications).where(eq(merchantApplications.id, id!)).limit(1);
  if (!application) return Response.json({ error: "Application not found." }, { status: 404 });
  let merchantId = application.merchantId;
  const storageResults = await Promise.allSettled(storageKeys.map((key) => fetch(createPresignedR2Url("DELETE", key, 120), { method: "DELETE" })));
  const storageFailures = storageResults.filter((result) => result.status === "rejected" || !result.value.ok).length;
  if (storageFailures) { console.error("application document cleanup incomplete", { applicationId: application.id, storageFailures }); return Response.json({ error: "Uploaded documents could not all be removed. Nothing was deleted from the application database; please retry." }, { status: 502 }); }
  await db.transaction(async (tx) => {
    if (status === "approved" && !merchantId) { const [merchant] = await tx.insert(merchants).values({ name: application.tradingName, slug: `${slugify(application.tradingName) || "merchant"}-${application.id}`, category: application.category, offeringType: application.offeringType, locationType: application.locationType, mainOperatingArea: application.mainOperatingArea, status: "onboarding", contactName: application.representativeName, contactEmail: application.email, contactPhone: application.phone, website: application.website, pickupLocation: application.physicalAddress, deliveryMode: application.deliveryAvailable ? "merchant_managed" : "pickup_only", setupStep: 1 }).returning(); merchantId = merchant.id; }
    if (status === "approved" && merchantId) { const [account] = await tx.select().from(users).where(eq(users.email, application.email)).limit(1); if (account) await tx.insert(merchantMemberships).values({ merchantId, userRef: String(account.id), email: account.email, displayName: account.displayName, role: "owner", status: "active" }).onConflictDoNothing(); const [tenant] = application.platformTenantId ? await tx.select().from(platformTenants).where(eq(platformTenants.id, application.platformTenantId)).limit(1) : await tx.select().from(platformTenants).where(eq(platformTenants.slug, "neurocity")).limit(1); if (tenant) await tx.insert(platformTenantMerchants).values({ tenantId: tenant.id, merchantId, status: "active" }).onConflictDoNothing(); }
    await tx.update(merchantApplications).set({ status, reviewNotes: notes?.trim() || null, reviewedAt: new Date(), reviewedBy: Number(user.userId), merchantId }).where(and(eq(merchantApplications.id, application.id), eq(merchantApplications.status, application.status)));
    await tx.insert(auditEvents).values({ actorRef: user.userId, action: `application.${status}`, resourceType: "merchant_application", resourceId: String(application.id), metadata: { notes: notes?.trim() || null, merchantId } });
  });
  const appUrl = process.env.APP_URL ?? "https://neurocity-fhl1.onrender.com";
  const instructions = status === "approved" ? `Your application is approved. Create your merchant account at ${appUrl}/login?mode=register using ${application.email}.` : status === "more_information_required" ? `More information is required. Review note: ${notes || "Please contact NeuroCity."}` : status === "rejected" ? `The application was not approved. Review note: ${notes || "Contact NeuroCity for more information."}` : "Your application is now under review.";
  await sendMail({ to: application.email, subject: `NeuroCity application ${application.reference}: ${status.replaceAll("_", " ")}`, text: `Hello ${application.representativeName},\n\n${instructions}\n\nReference: ${application.reference}` }).catch((error) => console.error("application status email failed", error));
  return Response.json({ application: { ...application, status, reviewNotes: notes, merchantId } });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (user?.platformRole !== "administrator") return Response.json({ error: "Administrator access required." }, { status: 403 });
  const { id, confirmation } = await request.json() as { id?: number; confirmation?: string };
  if (!Number.isInteger(id) || !confirmation?.trim()) return Response.json({ error: "Valid application and confirmation reference required." }, { status: 400 });
  const db = getDb();
  const [application] = await db.select().from(merchantApplications).where(eq(merchantApplications.id, id!)).limit(1);
  if (!application) return Response.json({ error: "Application not found." }, { status: 404 });
  if (confirmation.trim().toUpperCase() !== application.reference.toUpperCase()) return Response.json({ error: "Enter the application reference exactly to confirm deletion." }, { status: 400 });
  if (application.merchantId) return Response.json({ error: "This application belongs to an approved merchant. Remove the merchant account instead so transaction records remain intact." }, { status: 409 });
  const documents = await db.select({ storageKey: applicationDocuments.storageKey }).from(applicationDocuments).where(eq(applicationDocuments.applicationId, application.id));
  const storageKeys = documents.map((document) => document.storageKey).filter((key): key is string => Boolean(key));
  await db.transaction(async (tx) => {
    const [deleted] = await tx.delete(merchantApplications).where(eq(merchantApplications.id, application.id)).returning({ id: merchantApplications.id });
    if (!deleted) throw new Error("Application deletion conflict.");
    await tx.insert(auditEvents).values({ actorRef: user.userId, action: "application.deleted", resourceType: "merchant_application", resourceId: String(application.id), metadata: { reference: application.reference, documentCount: storageKeys.length } });
  });
  return Response.json({ ok: true, deletedApplicationId: application.id, deletedDocuments: storageKeys.length });
}

import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { applicationDocuments, auditEvents, merchantApplications, merchantMemberships, merchants, platformTenantMerchants, platformTenants, users } from "../../../../db/schema";
import { sendMail } from "../../../../lib/mail";
import { createPresignedR2Url } from "../../../../lib/r2";
import { getChatGPTUser } from "../../../chatgpt-auth";

const allowed = new Set(["under_review", "more_information_required", "approved", "rejected"]);
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 180);
const documentViewUrl = (storageKey: string, originalName: string | null) => { try { return createPresignedR2Url("GET", storageKey, 300, `inline; filename="${(originalName ?? "document").replace(/["\\]/g, "-")}"`); } catch { return null; } };

export async function GET() { const user = await getChatGPTUser(); if (user?.platformRole !== "administrator") return Response.json({ error: "Administrator access required." }, { status: 403 }); const db = getDb(); const applications = await db.select().from(merchantApplications).orderBy(desc(merchantApplications.submittedAt)); const merchantList = await db.select().from(merchants).orderBy(desc(merchants.createdAt)); const documents = applications.length ? await db.select().from(applicationDocuments).where(inArray(applicationDocuments.applicationId, applications.map((item) => item.id))) : []; const withDocuments = applications.map((application) => ({ ...application, documents: documents.filter((document) => document.applicationId === application.id).map((document) => ({ ...document, viewUrl: document.status === "uploaded" && document.storageKey ? documentViewUrl(document.storageKey, document.originalName) : null })) })); return Response.json({ applications: withDocuments, merchants: merchantList }); }

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (user?.platformRole !== "administrator") return Response.json({ error: "Administrator access required." }, { status: 403 });
  const { id, status, notes } = await request.json() as { id?: number; status?: string; notes?: string };
  if (!Number.isInteger(id) || !status || !allowed.has(status)) return Response.json({ error: "Valid application and review status required." }, { status: 400 });
  const db = getDb(); const [application] = await db.select().from(merchantApplications).where(eq(merchantApplications.id, id!)).limit(1);
  if (!application) return Response.json({ error: "Application not found." }, { status: 404 });
  let merchantId = application.merchantId;
  await db.transaction(async (tx) => {
    if (status === "approved" && !merchantId) { const [merchant] = await tx.insert(merchants).values({ name: application.tradingName, slug: `${slugify(application.tradingName) || "merchant"}-${application.id}`, category: application.category, status: "onboarding", contactName: application.representativeName, contactEmail: application.email, contactPhone: application.phone, website: application.website, pickupLocation: application.branchLocations, deliveryMode: application.deliveryAvailable ? "merchant_managed" : "pickup_only", setupStep: 1 }).returning(); merchantId = merchant.id; }
    if (status === "approved" && merchantId) { const [account] = await tx.select().from(users).where(eq(users.email, application.email)).limit(1); if (account) await tx.insert(merchantMemberships).values({ merchantId, userRef: String(account.id), email: account.email, displayName: account.displayName, role: "owner", status: "active" }).onConflictDoNothing(); const [tenant] = await tx.select().from(platformTenants).where(eq(platformTenants.slug, "neurocity")).limit(1); if (tenant) await tx.insert(platformTenantMerchants).values({ tenantId: tenant.id, merchantId, status: "active" }).onConflictDoNothing(); }
    await tx.update(merchantApplications).set({ status, reviewNotes: notes?.trim() || null, reviewedAt: new Date(), reviewedBy: Number(user.userId), merchantId }).where(and(eq(merchantApplications.id, application.id), eq(merchantApplications.status, application.status)));
    await tx.insert(auditEvents).values({ actorRef: user.userId, action: `application.${status}`, resourceType: "merchant_application", resourceId: String(application.id), metadata: { notes: notes?.trim() || null, merchantId } });
  });
  const appUrl = process.env.APP_URL ?? "https://neurocity-fhl1.onrender.com";
  const instructions = status === "approved" ? `Your application is approved. Create your merchant account at ${appUrl}/login?mode=register using ${application.email}.` : status === "more_information_required" ? `More information is required. Review note: ${notes || "Please contact NeuroCity."}` : status === "rejected" ? `The application was not approved. Review note: ${notes || "Contact NeuroCity for more information."}` : "Your application is now under review.";
  await sendMail({ to: application.email, subject: `NeuroCity application ${application.reference}: ${status.replaceAll("_", " ")}`, text: `Hello ${application.representativeName},\n\n${instructions}\n\nReference: ${application.reference}` }).catch((error) => console.error("application status email failed", error));
  return Response.json({ application: { ...application, status, reviewNotes: notes, merchantId } });
}

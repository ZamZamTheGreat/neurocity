import { randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../db";
import { applicationDocuments, merchantApplications, platformTenants, users } from "../../../db/schema";
import { sendMail } from "../../../lib/mail";
import { isMerchantCategory } from "../../../lib/merchant-categories";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "../../chatgpt-auth";
import { PRIVACY_NOTICE_VERSION } from "../../../lib/privacy";

const requiredDocuments = ["business_registration", "representative_identification", "proof_of_business_address", "bank_confirmation_letter"];
const required = ["legalName", "tradingName", "registrationNumber", "businessType", "category", "mainOperatingArea", "description", "representativeName", "representativeRole", "email", "phone", "physicalAddress"];
const offeringTypes = new Set(["products", "services", "both"]);
const locationTypes = new Set(["physical_store", "service_area", "both", "remote"]);

export async function GET(request: Request) {
  const url = new URL(request.url); const reference = url.searchParams.get("reference")?.trim().toUpperCase(); const email = url.searchParams.get("email")?.trim().toLowerCase();
  if (!reference || !email) return Response.json({ error: "Reference and email are required." }, { status: 400 });
  const [application] = await getDb().select({ reference: merchantApplications.reference, tradingName: merchantApplications.tradingName, status: merchantApplications.status, submittedAt: merchantApplications.submittedAt, reviewedAt: merchantApplications.reviewedAt, reviewNotes: merchantApplications.reviewNotes }).from(merchantApplications).where(and(eq(merchantApplications.reference, reference), eq(merchantApplications.email, email))).limit(1);
  if (!application) return Response.json({ error: "Application not found." }, { status: 404 });
  return Response.json({ application });
}

export async function POST(request: Request) {
  try {
    const data = await request.json() as Record<string, unknown>;
    data.branchCount ??= 1;
    data.branchLocations ??= "";
    data.productSummary ??= "";
    data.estimatedProductCount ??= 1;
    data.returnsPolicy ??= "";
    for (const field of required) if (!String(data[field] ?? "").trim()) return Response.json({ error: `${field} is required.` }, { status: 400 });
    if (!isMerchantCategory(data.category)) return Response.json({ error: "Select a valid main category." }, { status: 400 });
    if (String(data.category) === "Services" && data.offeringType === "products") data.offeringType = "services";
    if (!offeringTypes.has(String(data.offeringType ?? ""))) return Response.json({ error: "Choose whether the business offers products, services or both." }, { status: 400 });
    if (!locationTypes.has(String(data.locationType ?? ""))) return Response.json({ error: "Choose how customers access this business." }, { status: 400 });
    if (!String(data.email).includes("@") || data.termsAccepted !== true || data.privacyAccepted !== true) return Response.json({ error: "A valid email and acceptance of the merchant terms and privacy notice are required." }, { status: 400 });
    const password = String(data.password ?? "");
    if (password.length < 10) return Response.json({ error: "Create a password of at least 10 characters." }, { status: 400 });
    if (password !== String(data.confirmPassword ?? "")) return Response.json({ error: "The passwords do not match." }, { status: 400 });
    const reference = `NCA-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const db = getDb();
    const normalizedEmail = String(data.email).trim().toLowerCase();
    const requestedPlatformSlug = String(data.mallSlug ?? "neurocity").trim() || "neurocity";
    const [targetPlatform] = await db.select().from(platformTenants).where(and(eq(platformTenants.slug, requestedPlatformSlug), eq(platformTenants.status, "active"))).limit(1);
    if (!targetPlatform || (requestedPlatformSlug !== "neurocity" && targetPlatform.kind !== "mall")) return Response.json({ error: "This marketplace or digital mall is not accepting applications." }, { status: 404 });
    const [existingUser] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existingUser && existingUser.status !== "active") return Response.json({ error: "This account is unavailable. Contact NeuroCity support." }, { status: 403 });
    if (existingUser?.passwordHash && !(await compare(password, existingUser.passwordHash))) return Response.json({ error: "An account already exists for this email. Enter that account’s password to continue." }, { status: 409 });
    if (existingUser && !existingUser.passwordHash) return Response.json({ error: "This email already has an account that cannot use password sign-in. Contact NeuroCity support." }, { status: 409 });
    const passwordHash = existingUser ? null : await hash(password, 12);
    const { application, user } = await db.transaction(async (tx) => {
      const [user] = existingUser ? [existingUser] : await tx.insert(users).values({ email: normalizedEmail, displayName: String(data.representativeName).trim(), passwordHash, platformRole: "customer", privacyNoticeVersion: PRIVACY_NOTICE_VERSION, privacyAcceptedAt: new Date() }).returning();
      if (existingUser) await tx.update(users).set({ privacyNoticeVersion: PRIVACY_NOTICE_VERSION, privacyAcceptedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, existingUser.id));
      const [application] = await tx.insert(merchantApplications).values({ reference, legalName: String(data.legalName).trim(), tradingName: String(data.tradingName).trim(), registrationNumber: String(data.registrationNumber).trim(), businessType: String(data.businessType).trim(), category: String(data.category).trim(), offeringType: String(data.offeringType), description: String(data.description).trim(), representativeName: String(data.representativeName).trim(), representativeRole: String(data.representativeRole).trim(), email: normalizedEmail, phone: String(data.phone).trim(), physicalAddress: String(data.physicalAddress).trim(), website: String(data.website ?? "").trim() || null, socialProfiles: String(data.socialProfiles ?? "").trim() || null, branchCount: Math.max(1, Number(data.branchCount) || 1), branchLocations: String(data.branchLocations).trim(), productSummary: String(data.productSummary).trim(), estimatedProductCount: Math.max(1, Number(data.estimatedProductCount) || 1), pickupAvailable: data.pickupAvailable === true, deliveryAvailable: data.deliveryAvailable === true, deliveryDetails: String(data.deliveryDetails ?? "").trim() || null, returnsPolicy: String(data.returnsPolicy).trim(), termsAccepted: true, privacyAccepted: true }).returning();
      await tx.update(merchantApplications).set({ platformTenantId: targetPlatform.id, locationType: String(data.locationType), mainOperatingArea: String(data.mainOperatingArea).trim() }).where(eq(merchantApplications.id, application.id));
      await tx.insert(applicationDocuments).values(requiredDocuments.map((documentType) => ({ applicationId: application.id, documentType })));
      return { application, user };
    });
    const session = await createSession(user.id);
    (await cookies()).set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
    const appUrl = process.env.APP_URL ?? "https://neurocity-fhl1.onrender.com";
    await Promise.allSettled([
      sendMail({ to: application.email, subject: `NeuroCity application ${reference} received`, text: `Hello ${application.representativeName},\n\nWe received the merchant application for ${application.tradingName}. Your reference is ${reference}.\n\nNeuroCity will email you when its review status changes.\n\n${appUrl}` }),
      sendMail({ to: process.env.ADMIN_EMAIL ?? "sergejwitbooi@gmail.com", subject: `New NeuroCity merchant application: ${application.tradingName}`, text: `${application.tradingName} submitted application ${reference}.\n\nReview it at ${appUrl}/admin` }),
    ]);
    return Response.json({ application: { reference, status: application.status }, account: { email: user.email, signedIn: true }, requiredDocuments }, { status: 201 });
  } catch (error) { console.error("merchant application submission failed", error); return Response.json({ error: "Application could not be submitted." }, { status: 500 }); }
}

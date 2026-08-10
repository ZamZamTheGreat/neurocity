import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { applicationDocuments, merchantApplications } from "../../../db/schema";
import { sendMail } from "../../../lib/mail";

const requiredDocuments = ["business_registration", "representative_identification", "proof_of_business_address", "bank_confirmation_letter"];
const required = ["legalName", "tradingName", "registrationNumber", "businessType", "category", "description", "representativeName", "representativeRole", "email", "phone", "physicalAddress", "branchLocations", "productSummary", "returnsPolicy"];

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
    for (const field of required) if (!String(data[field] ?? "").trim()) return Response.json({ error: `${field} is required.` }, { status: 400 });
    if (!String(data.email).includes("@") || data.termsAccepted !== true || data.privacyAccepted !== true) return Response.json({ error: "A valid email and acceptance of the merchant terms and privacy notice are required." }, { status: 400 });
    const reference = `NCA-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const db = getDb();
    const [application] = await db.insert(merchantApplications).values({ reference, legalName: String(data.legalName).trim(), tradingName: String(data.tradingName).trim(), registrationNumber: String(data.registrationNumber).trim(), businessType: String(data.businessType).trim(), category: String(data.category).trim(), description: String(data.description).trim(), representativeName: String(data.representativeName).trim(), representativeRole: String(data.representativeRole).trim(), email: String(data.email).trim().toLowerCase(), phone: String(data.phone).trim(), physicalAddress: String(data.physicalAddress).trim(), website: String(data.website ?? "").trim() || null, socialProfiles: String(data.socialProfiles ?? "").trim() || null, branchCount: Math.max(1, Number(data.branchCount) || 1), branchLocations: String(data.branchLocations).trim(), productSummary: String(data.productSummary).trim(), estimatedProductCount: Math.max(1, Number(data.estimatedProductCount) || 1), pickupAvailable: data.pickupAvailable === true, deliveryAvailable: data.deliveryAvailable === true, deliveryDetails: String(data.deliveryDetails ?? "").trim() || null, returnsPolicy: String(data.returnsPolicy).trim(), termsAccepted: true, privacyAccepted: true }).returning();
    await db.insert(applicationDocuments).values(requiredDocuments.map((documentType) => ({ applicationId: application.id, documentType })));
    const appUrl = process.env.APP_URL ?? "https://neurocity-fhl1.onrender.com";
    await Promise.allSettled([
      sendMail({ to: application.email, subject: `NeuroCity application ${reference} received`, text: `Hello ${application.representativeName},\n\nWe received the merchant application for ${application.tradingName}. Your reference is ${reference}.\n\nNeuroCity will email you when its review status changes.\n\n${appUrl}` }),
      sendMail({ to: process.env.ADMIN_EMAIL ?? "sergejwitbooi@gmail.com", subject: `New NeuroCity merchant application: ${application.tradingName}`, text: `${application.tradingName} submitted application ${reference}.\n\nReview it at ${appUrl}/admin` }),
    ]);
    return Response.json({ application: { reference, status: application.status }, requiredDocuments }, { status: 201 });
  } catch (error) { console.error("merchant application submission failed", error); return Response.json({ error: "Application could not be submitted." }, { status: 500 }); }
}

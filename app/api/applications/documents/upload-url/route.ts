import { createUploadUrl } from "../../../../../lib/upload-security";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { applicationDocuments, merchantApplications } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { allowedDocumentMimeTypes, createPresignedR2Url, documentTypes, maxDocumentBytes } from "../../../../../lib/r2";

export async function POST(request: Request) {
  const user = await getChatGPTUser(); if (!user) return Response.json({ error: "Sign in with the application email before uploading documents." }, { status: 401 });
  const { reference, documentType, filename, mimeType, sizeBytes } = await request.json() as { reference?: string; documentType?: string; filename?: string; mimeType?: string; sizeBytes?: number };
  if (!reference || !documentType || !documentTypes.has(documentType) || !filename || !mimeType || !allowedDocumentMimeTypes.has(mimeType) || !Number.isInteger(sizeBytes) || sizeBytes! < 1 || sizeBytes! > maxDocumentBytes) return Response.json({ error: "Upload a PDF, JPG or PNG document no larger than 10 MB." }, { status: 400 });
  const db = getDb(); const [application] = await db.select().from(merchantApplications).where(and(eq(merchantApplications.reference, reference.toUpperCase()), eq(merchantApplications.email, user.email.toLowerCase()))).limit(1);
  if (!application || application.status === "rejected" || application.status === "withdrawn") return Response.json({ error: "Eligible application not found." }, { status: 404 });
  const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120); const key = `applications/${application.id}/${documentType}/${randomUUID()}-${safeName}`;
  const uploadUrl = createUploadUrl(key, user.userId, mimeType, sizeBytes!);
  await db.update(applicationDocuments).set({ storageKey: key, originalName: filename, mimeType, sizeBytes, status: "upload_pending" }).where(and(eq(applicationDocuments.applicationId, application.id), eq(applicationDocuments.documentType, documentType)));
  return Response.json({ uploadUrl, expiresIn: 600 });
}

import { S3Client } from "@aws-sdk/client-s3";

export const documentTypes = new Set(["business_registration", "representative_identification", "proof_of_business_address", "bank_confirmation_letter"]);
export const allowedDocumentMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
export const maxDocumentBytes = 10 * 1024 * 1024;

export function getR2() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) throw new Error("Private document storage is not configured.");
  return { bucket, client: new S3Client({ region: process.env.R2_REGION ?? "auto", endpoint, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true }) };
}

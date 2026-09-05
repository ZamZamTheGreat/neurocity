import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { applicationDocuments } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { createPresignedR2Url } from "../../../../../lib/r2";
import { verifiedObject } from "../../../../../lib/upload-security";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (user?.platformRole !== "administrator") return Response.json({ error: "Administrator access required." }, { status: 403 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Invalid document." }, { status: 400 });
  const [document] = await getDb().select().from(applicationDocuments).where(eq(applicationDocuments.id, id)).limit(1);
  if (!document?.storageKey || document.status !== "uploaded") return Response.json({ error: "Document unavailable." }, { status: 404 });
  try { await verifiedObject(document.storageKey); }
  catch { return Response.json({ error: "This document requires a new verified upload." }, { status: 409 }); }
  return Response.redirect(createPresignedR2Url("GET", document.storageKey, 120, `attachment; filename="${(document.originalName ?? "document").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120)}"`));
}

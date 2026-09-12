import { getChatGPTUser } from "../../chatgpt-auth";
import { readBoundedBody } from "../../../lib/request-security";
import { verifyUploadTicket, storeScannedUpload } from "../../../lib/upload-security";
import { rateLimitResponse } from "../../../lib/security-rate-limit";
import { securityAlert, securityFingerprint } from "../../../lib/security-monitoring";

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const limited = await rateLimitResponse("uploads", user.userId, 10);
  if (limited) return limited;
  try {
    const ticket = verifyUploadTicket(new URL(request.url).searchParams.get("ticket") ?? "", user.userId);
    const bytes = await readBoundedBody(request, ticket.size);
    await storeScannedUpload(ticket, bytes);
    return Response.json({ ok: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Upload failed.";
    console.error("verified upload failed", reason);
    if (/Invalid upload|does not match its declared type|file was rejected/i.test(reason)) await securityAlert("upload_rejected", "warning", { userHash: securityFingerprint(user.userId) }, securityFingerprint(user.userId));
    const message = /scanning is temporarily unavailable/i.test(reason) ? "Secure scanning is temporarily unavailable. Please try again shortly." : /Unsupported PDF/i.test(reason) ? "This PDF is encrypted, empty, or has too many pages. Save an unencrypted copy and retry." : /too large/i.test(reason) ? "The processed file is larger than 10 MB. Choose a smaller file and retry." : "This file could not be read safely. Try another PDF, JPG or PNG file.";
    return Response.json({ error: message }, { status: 422 });
  }
}

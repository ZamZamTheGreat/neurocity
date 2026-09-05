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
    console.error("verified upload failed", error instanceof Error ? error.message : error);
    await securityAlert("upload_rejected", "warning", { userHash: securityFingerprint(user.userId) }, securityFingerprint(user.userId));
    return Response.json({ error: "File could not be verified. Check its type and size, then retry. If this continues, contact support." }, { status: 422 });
  }
}

import { getDb } from "../../../../db";
import { auditEvents } from "../../../../db/schema";
import { privateContactReference, verifyMetaWebhookSignature } from "../../../../lib/meta-webhook";
import { readBoundedBody } from "../../../../lib/request-security";

type MetaEvent = { id?: string; from?: string; recipient_id?: string; status?: string; timestamp?: string; type?: string; errors?: { code?: number }[] };
type MetaPayload = { entry?: { changes?: { value?: { messages?: MetaEvent[]; statuses?: MetaEvent[] } }[] }[] };

export async function GET(request: Request) {
  const parameters = new URL(request.url).searchParams;
  const mode = parameters.get("hub.mode");
  const token = parameters.get("hub.verify_token");
  const challenge = parameters.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) return new Response(challenge, { status: 200, headers: { "content-type": "text/plain", "cache-control": "no-store" } });
  return Response.json({ error: "Webhook verification failed." }, { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await readBoundedBody(request, 256 * 1024);
    if (!verifyMetaWebhookSignature(body, request.headers.get("x-hub-signature-256"))) return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
    const payload = JSON.parse(new TextDecoder().decode(body)) as MetaPayload;
    const rows = (payload.entry ?? []).flatMap((entry) => (entry.changes ?? []).flatMap((change) => {
      const value = change.value;
      return [
        ...(value?.messages ?? []).map((message) => ({ actorRef: "meta-whatsapp", action: "whatsapp.message_received", resourceType: "whatsapp_message", resourceId: message.id ?? crypto.randomUUID(), metadata: { contactRef: privateContactReference(message.from), messageType: message.type ?? "unknown", timestamp: message.timestamp ?? null } })),
        ...(value?.statuses ?? []).map((status) => ({ actorRef: "meta-whatsapp", action: `whatsapp.message_${status.status ?? "unknown"}`, resourceType: "whatsapp_message", resourceId: status.id ?? crypto.randomUUID(), metadata: { contactRef: privateContactReference(status.recipient_id), status: status.status ?? "unknown", timestamp: status.timestamp ?? null, errorCodes: (status.errors ?? []).map((error) => error.code).filter(Boolean) } })),
      ];
    }));
    if (rows.length) await getDb().insert(auditEvents).values(rows);
    return new Response("EVENT_RECEIVED", { status: 200, headers: { "content-type": "text/plain", "cache-control": "no-store" } });
  } catch (error) {
    console.error("WhatsApp webhook processing failed", error);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

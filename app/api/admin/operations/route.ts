import { desc, gte } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { auditEvents } from "../../../../db/schema";

type AuditMetadata = Record<string, unknown> | string | null;

function metadata(value: AuditMetadata) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch { return {}; }
  }
  return {};
}

function severity(action: string, details: Record<string, unknown>) {
  if (action.includes("failed") || action.includes("rejected") || action.includes("signature") || (Array.isArray(details.errorCodes) && details.errorCodes.length)) return "critical";
  if (action.includes("skipped") || action.includes("refunded") || action.includes("cancelled") || action.includes("suspended") || action.includes("issue_opened")) return "attention";
  return "normal";
}

function area(action: string) {
  if (action.startsWith("whatsapp.") || action.includes("whatsapp")) return "WhatsApp";
  if (action.includes("payment") || action.includes("allocation") || action.includes("checkout")) return "Payments";
  if (action.includes("application") || action.includes("merchant")) return "Merchants";
  if (action.includes("order")) return "Orders";
  if (action.includes("security") || action.includes("mfa") || action.includes("login")) return "Security";
  return "Platform";
}

export async function GET() {
  const user = await getChatGPTUser();
  if (user?.platformRole !== "administrator") return Response.json({ error: "Administrator access required." }, { status: 403 });

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await getDb().select({ id: auditEvents.id, action: auditEvents.action, resourceType: auditEvents.resourceType, resourceId: auditEvents.resourceId, metadata: auditEvents.metadata, createdAt: auditEvents.createdAt })
    .from(auditEvents).where(gte(auditEvents.createdAt, since)).orderBy(desc(auditEvents.createdAt)).limit(150);
  const events = rows.map((event) => {
    const details = metadata(event.metadata as AuditMetadata);
    return { ...event, metadata: details, area: area(event.action), severity: severity(event.action, details) };
  });
  const attention = events.filter((event) => event.severity !== "normal");
  const whatsapp = events.filter((event) => event.area === "WhatsApp");

  return Response.json({
    generatedAt: new Date().toISOString(),
    windowDays: 7,
    summary: {
      attention: attention.length,
      critical: attention.filter((event) => event.severity === "critical").length,
      whatsappReceived: whatsapp.filter((event) => event.action === "whatsapp.message_received").length,
      whatsappDelivered: whatsapp.filter((event) => event.action === "whatsapp.message_delivered" || event.action === "order.whatsapp_sent").length,
      whatsappFailed: whatsapp.filter((event) => event.severity !== "normal").length,
    },
    integrations: [
      { name: "Database", configured: true, detail: "Connected" },
      { name: "WhatsApp sending", configured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID), detail: "Access token and phone number" },
      { name: "WhatsApp webhook", configured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN && process.env.META_APP_SECRET), detail: "Verification and signature checks" },
      { name: "Transactional email", configured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS), detail: "Customer and merchant notices" },
      { name: "PayToday", configured: Boolean(process.env.PAYTODAY_SHOP_KEY && process.env.PAYTODAY_SHOP_HANDLE && process.env.PAYTODAY_PRIVATE_KEY), detail: "Payment credentials" },
      { name: "Security alerts", configured: Boolean(process.env.SECURITY_ALERT_WEBHOOK_URL || (process.env.SMTP_USER && process.env.SMTP_PASS && (process.env.SECURITY_ALERT_EMAIL || process.env.ADMIN_EMAIL))), detail: "Administrator escalation channel" },
    ],
    attention: attention.slice(0, 30),
    recent: events.slice(0, 40),
  }, { headers: { "cache-control": "no-store" } });
}

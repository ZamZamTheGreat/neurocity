type OrderUpdate = { phone: string; reference: string; storeName: string; status: string; note?: string | null };

export function whatsappDigits(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `264${digits.slice(1)}`;
  return digits;
}

export async function sendWhatsAppOrderUpdate(update: OrderUpdate) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.WHATSAPP_ORDER_TEMPLATE;
  if (!token || !phoneNumberId || !template || !update.phone) return { delivered: false, reason: "not_configured" } as const;
  const response = await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION ?? "v22.0"}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: whatsappDigits(update.phone), type: "template", template: { name: template, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en" }, components: [{ type: "body", parameters: [update.reference, update.storeName, update.status.replaceAll("_", " "), update.note ?? "No additional note"].map((text) => ({ type: "text", text })) }] } }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`WhatsApp delivery returned ${response.status}`);
  return { delivered: true } as const;
}

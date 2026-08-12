import { sendMail } from "./mail";

type OrderLine = { name: string; option?: string | null; quantity: number; lineTotal: number };
type OrderNotice = { reference: string; storeName: string; customerName: string; customerEmail: string; merchantEmail?: string | null; status: string; total: number; fulfillmentMethod: string; lines?: OrderLine[]; note?: string | null };

const siteUrl = () => (process.env.PUBLIC_SITE_URL ?? process.env.APP_URL ?? "https://neurocity-fhl1.onrender.com").replace(/\/$/, "");
const money = (value: number) => `N$${Number(value).toFixed(2)}`;
const words = (value: string) => value.replaceAll("_", " ");
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);

function layout(title: string, intro: string, body: string, actionLabel: string, actionUrl: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f2ee;font-family:Arial,sans-serif;color:#191916"><div style="max-width:620px;margin:0 auto;padding:30px 16px"><div style="padding:18px 22px;background:#171713;color:#fff;border-radius:14px 14px 0 0"><b style="font-size:21px">Neuro<span style="color:#9b84ff">City</span></b><span style="float:right;color:#aaa69f;font-size:12px">Windhoek</span></div><div style="padding:26px 22px;background:#fff;border-radius:0 0 14px 14px"><p style="margin:0 0 8px;color:#7457ff;font-size:11px;font-weight:bold;letter-spacing:1px">ORDER UPDATE</p><h1 style="margin:0 0 12px;font-size:26px">${escapeHtml(title)}</h1><p style="margin:0 0 22px;color:#625e57;line-height:1.55">${escapeHtml(intro)}</p>${body}<a href="${actionUrl}" style="display:inline-block;margin-top:22px;padding:13px 18px;border-radius:9px;background:#7457ff;color:#fff;text-decoration:none;font-weight:bold">${escapeHtml(actionLabel)}</a><p style="margin:24px 0 0;color:#918b83;font-size:11px">This is an automatic NeuroCity transaction message.</p></div></div></body></html>`;
}

export async function sendOrderPlacedNotifications(notice: OrderNotice) {
  const lines = notice.lines ?? [];
  const rows = lines.map((line) => `<tr><td style="padding:9px 0;border-bottom:1px solid #eeeae4"><b>${escapeHtml(line.name)}</b><br><span style="color:#777168;font-size:12px">${escapeHtml(line.option ?? "Standard")} · Qty ${line.quantity}</span></td><td style="padding:9px 0;border-bottom:1px solid #eeeae4;text-align:right">${money(line.lineTotal)}</td></tr>`).join("");
  const summary = `<div style="padding:16px;border-radius:10px;background:#f7f5f1"><b>${notice.reference}</b><span style="float:right">${money(notice.total)}</span><p style="margin:7px 0 0;color:#6e6962;font-size:12px;text-transform:capitalize">${escapeHtml(words(notice.fulfillmentMethod))}</p></div><table style="width:100%;margin-top:12px;border-collapse:collapse">${rows}</table>`;
  const customer = sendMail({ to: notice.customerEmail, subject: `${notice.reference} received by ${notice.storeName}`, text: `Your order ${notice.reference} for ${money(notice.total)} has been sent to ${notice.storeName} for confirmation. Track it at ${siteUrl()}/account`, html: layout("Your order has been received", `${notice.storeName} will confirm availability and begin preparing your order.`, summary, "Track my order", `${siteUrl()}/account`) });
  const merchant = notice.merchantEmail ? sendMail({ to: notice.merchantEmail, subject: `New NeuroCity order ${notice.reference}`, text: `New order ${notice.reference} from ${notice.customerName}, total ${money(notice.total)}. Open your merchant dashboard to accept or reject it: ${siteUrl()}/`, html: layout("You have a new order", `${notice.customerName} placed an order that needs your confirmation.`, summary, "Review order", `${siteUrl()}/`) }) : Promise.resolve();
  await Promise.allSettled([customer, merchant]);
}

export async function sendOrderStatusNotification(notice: OrderNotice) {
  const status = words(notice.status);
  const detail = `<div style="padding:16px;border-radius:10px;background:#f7f5f1"><b>${notice.reference}</b><span style="float:right">${money(notice.total)}</span><p style="margin:7px 0 0;text-transform:capitalize;color:#4f3e9d;font-weight:bold">${escapeHtml(status)}</p>${notice.note ? `<p style="margin:8px 0 0;color:#6e6962">${escapeHtml(notice.note)}</p>` : ""}</div>`;
  await Promise.allSettled([sendMail({ to: notice.customerEmail, subject: `${notice.reference}: ${status}`, text: `${notice.storeName} updated order ${notice.reference} to ${status}. Track it at ${siteUrl()}/account`, html: layout(`Order ${status}`, `${notice.storeName} updated your order.`, detail, "View order details", `${siteUrl()}/account`) })]);
}

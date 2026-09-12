import { sendMail } from "./mail";
import { escapeEmailHtml as escapeHtml, neuroCityEmail, neuroCityUrl } from "./email-template";

type OrderLine = { name: string; option?: string | null; quantity: number; lineTotal: number };
type PaymentInstructions = { bankName: string; accountHolder: string; accountType: string; accountNumber: string; branchCode: string; referenceInstructions: string };
type OrderNotice = { reference: string; storeName: string; customerName: string; customerEmail: string; merchantEmail?: string | null; status: string; total: number; fulfillmentMethod: string; lines?: OrderLine[]; note?: string | null; paymentInstructions?: PaymentInstructions | null };

const siteUrl = neuroCityUrl;
const money = (value: number) => `N$${Number(value).toFixed(2)}`;
const words = (value: string) => value.replaceAll("_", " ");

function layout(title: string, intro: string, body: string, actionLabel: string, actionUrl: string) {
  return neuroCityEmail({ eyebrow: "ORDER UPDATE", title, intro, bodyHtml: body, actionLabel, actionUrl, footerNote: "This is an automatic NeuroCity transaction message. Keep the order reference for support." });
}

export async function sendOrderPlacedNotifications(notice: OrderNotice) {
  const lines = notice.lines ?? [];
  const rows = lines.map((line) => `<tr><td style="padding:9px 0;border-bottom:1px solid #eeeae4"><b>${escapeHtml(line.name)}</b><br><span style="color:#777168;font-size:12px">${escapeHtml(line.option ?? "Standard")} · Qty ${line.quantity}</span></td><td style="padding:9px 0;border-bottom:1px solid #eeeae4;text-align:right">${money(line.lineTotal)}</td></tr>`).join("");
  const payment = notice.paymentInstructions ? `<div style="margin-top:16px;padding:16px;border-radius:10px;background:#f3effd"><b>EFT instructions</b><p style="line-height:1.65;color:#514b61">${escapeHtml(notice.paymentInstructions.bankName)}<br>${escapeHtml(notice.paymentInstructions.accountHolder)} · ${escapeHtml(notice.paymentInstructions.accountType)}<br>Account: <b>${escapeHtml(notice.paymentInstructions.accountNumber)}</b><br>Branch: ${escapeHtml(notice.paymentInstructions.branchCode)}<br>Reference: <b>${escapeHtml(notice.reference)}</b></p><small>${escapeHtml(notice.paymentInstructions.referenceInstructions)}</small></div>` : "";
  const summary = `<div style="padding:16px;border-radius:10px;background:#f7f5f1"><b>${notice.reference}</b><span style="float:right">${money(notice.total)}</span><p style="margin:7px 0 0;color:#6e6962;font-size:12px;text-transform:capitalize">${escapeHtml(words(notice.fulfillmentMethod))}</p></div><table style="width:100%;margin-top:12px;border-collapse:collapse">${rows}</table>${payment}`;
  const paymentText = notice.paymentInstructions ? ` EFT: ${notice.paymentInstructions.bankName}, ${notice.paymentInstructions.accountHolder}, account ${notice.paymentInstructions.accountNumber}, branch ${notice.paymentInstructions.branchCode}. Use ${notice.reference} as the payment reference.` : "";
  const customer = sendMail({ to: notice.customerEmail, subject: `${notice.reference} received by ${notice.storeName}`, text: `Your order request ${notice.reference} for ${money(notice.total)} has been sent to ${notice.storeName}. No payment has been taken. The store has 30 minutes to confirm availability.${paymentText} Track it at ${siteUrl()}/account`, html: layout("Your order request has been received", `${notice.storeName} has 30 minutes to confirm availability. No payment has been taken; PayToday opens after every store confirms.`, summary, notice.paymentInstructions ? "Pay and upload proof" : "Track my request", `${siteUrl()}/account`) });
  const merchant = notice.merchantEmail ? sendMail({ to: notice.merchantEmail, subject: `New NeuroCity order request ${notice.reference}`, text: `New order request ${notice.reference} from ${notice.customerName}, total ${money(notice.total)}. Confirm or reject availability within 30 minutes: ${siteUrl()}/`, html: layout("You have a new order request", `${notice.customerName} needs your availability decision within 30 minutes.`, summary, "Review request", `${siteUrl()}/`) }) : Promise.resolve();
  await Promise.allSettled([customer, merchant]);
}

export async function sendOrderStatusNotification(notice: OrderNotice) {
  const status = words(notice.status);
  const detail = `<div style="padding:16px;border-radius:10px;background:#f7f5f1"><b>${notice.reference}</b><span style="float:right">${money(notice.total)}</span><p style="margin:7px 0 0;text-transform:capitalize;color:#4f3e9d;font-weight:bold">${escapeHtml(status)}</p>${notice.note ? `<p style="margin:8px 0 0;color:#6e6962">${escapeHtml(notice.note)}</p>` : ""}</div>`;
  await Promise.allSettled([sendMail({ to: notice.customerEmail, subject: `${notice.reference}: ${status}`, text: `${notice.storeName} updated order ${notice.reference} to ${status}. Track it at ${siteUrl()}/account`, html: layout(`Order ${status}`, `${notice.storeName} updated your order.`, detail, "View order details", `${siteUrl()}/account`) })]);
}

export async function sendOrderDeadlineNotification(input: { to: string; reference: string; storeName: string; kind: "merchant_confirmation_reminder" | "customer_payment_open" | "customer_payment_reminder" | "confirmation_expired" | "payment_expired"; minutesRemaining?: number }) {
  const messages = {
    merchant_confirmation_reminder: { subject: `${input.reference}: confirmation needed`, title: "Confirm this request now", intro: `${input.reference} is still waiting for an availability decision from ${input.storeName}. About ${input.minutesRemaining ?? 10} minutes remain before the reservation expires.`, action: "Review request", url: siteUrl() },
    customer_payment_open: { subject: `${input.reference}: ready for payment`, title: "Every store has confirmed", intro: "Your items are available and reserved. Complete PayToday payment within 30 minutes to place the confirmed checkout.", action: "Pay now", url: `${siteUrl()}/account` },
    customer_payment_reminder: { subject: `${input.reference}: payment window ending`, title: "Complete your confirmed checkout", intro: `Every store has confirmed your NeuroCity checkout. About ${input.minutesRemaining ?? 10} minutes remain to complete PayToday payment.`, action: "Pay now", url: `${siteUrl()}/account` },
    confirmation_expired: { subject: `${input.reference}: request expired`, title: "The confirmation window expired", intro: `${input.storeName} did not confirm availability within 30 minutes. No payment was taken and the reserved stock has been released.`, action: "View orders", url: `${siteUrl()}/account` },
    payment_expired: { subject: `${input.reference}: payment window expired`, title: "The payment window expired", intro: `The confirmed checkout was not paid within 30 minutes. No charge was completed and the reserved stock has been released.`, action: "View orders", url: `${siteUrl()}/account` },
  }[input.kind];
  return sendMail({ to: input.to, subject: messages.subject, text: `${messages.intro} ${messages.url}`, html: layout(messages.title, messages.intro, `<div style="padding:16px;border-radius:10px;background:#f7f5f1"><b>${escapeHtml(input.reference)}</b><p style="margin:7px 0 0;color:#6e6962">${escapeHtml(input.storeName)}</p></div>`, messages.action, messages.url) });
}

import { sendMail } from "./mail";

export type BookingNotice = { reference: string; serviceName: string; storeName: string; customerName: string; customerEmail: string; merchantEmail?: string | null; status: string; requestedStart: Date; scheduledStart?: Date | null; durationMinutes?: number | null; serviceMode?: string | null; price?: number | null; pricingModel?: string; note?: string | null };
const siteUrl = () => (process.env.PUBLIC_SITE_URL ?? process.env.APP_URL ?? "https://neurocity-fhl1.onrender.com").replace(/\/$/, "");
const words = (value: string) => value.replaceAll("_", " ");
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);
const dateTime = (value: Date) => value.toLocaleString("en-NA", { timeZone: "Africa/Windhoek", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
const price = (notice: BookingNotice) => notice.pricingModel === "quote" || notice.price == null ? "Quote required" : `N$${Number(notice.price).toFixed(2)}`;
function html(title: string, intro: string, notice: BookingNotice, action: string, url: string) { const scheduled = notice.scheduledStart ?? notice.requestedStart; return `<!doctype html><html><body style="margin:0;background:#f3f5f4;font-family:Arial,sans-serif;color:#0b1820"><div style="max-width:620px;margin:auto;padding:30px 16px"><div style="padding:18px 22px;background:#07111f;color:#fff;border-radius:14px 14px 0 0"><b style="font-size:21px">Neuro<span style="color:#18c98e">City</span></b><span style="float:right;color:#9ba7af;font-size:12px">Namibia</span></div><div style="padding:26px 22px;background:#fff;border-radius:0 0 14px 14px"><p style="margin:0 0 8px;color:#0aa574;font-size:11px;font-weight:bold;letter-spacing:1px">SERVICE BOOKING</p><h1 style="margin:0 0 12px;font-size:26px">${escapeHtml(title)}</h1><p style="color:#5f6a70;line-height:1.55">${escapeHtml(intro)}</p><div style="padding:17px;border-radius:11px;background:#f2f7f5;line-height:1.7"><b>${escapeHtml(notice.reference)} · ${escapeHtml(notice.serviceName)}</b><br>${escapeHtml(notice.storeName)}<br><span>${escapeHtml(dateTime(scheduled))}${notice.durationMinutes ? ` · ${notice.durationMinutes} minutes` : ""}</span><br><span style="text-transform:capitalize">${escapeHtml(words(notice.serviceMode ?? "at_business"))} · ${escapeHtml(price(notice))}</span>${notice.note ? `<p style="margin:10px 0 0;color:#59646a">${escapeHtml(notice.note)}</p>` : ""}</div><a href="${url}" style="display:inline-block;margin-top:22px;padding:13px 18px;border-radius:9px;background:#10aa79;color:#fff;text-decoration:none;font-weight:bold">${escapeHtml(action)}</a><p style="margin:24px 0 0;color:#8a959b;font-size:11px">Automatic NeuroCity booking notification.</p></div></div></body></html>`; }

export async function sendBookingRequestedNotifications(notice: BookingNotice) {
  const reference = notice.reference; const when = dateTime(notice.requestedStart);
  const customer = sendMail({ to: notice.customerEmail, subject: `${reference} service request received`, text: `Your ${notice.serviceName} request for ${when} was sent to ${notice.storeName}. Track it at ${siteUrl()}/account`, html: html("Your request was sent", `${notice.storeName} will confirm the appointment or propose another time.`, notice, "Track booking", `${siteUrl()}/account`) });
  const merchant = notice.merchantEmail ? sendMail({ to: notice.merchantEmail, subject: `New service request ${reference}`, text: `${notice.customerName} requested ${notice.serviceName} for ${when}. Review it in your NeuroCity Bookings dashboard: ${siteUrl()}/`, replyTo: notice.customerEmail, html: html("New service request", `${notice.customerName} is waiting for your decision.`, notice, "Review booking", `${siteUrl()}/`) }) : Promise.resolve();
  await Promise.allSettled([customer, merchant]);
}

export async function sendBookingStatusNotification(notice: BookingNotice) {
  const status = words(notice.status); const when = dateTime(notice.scheduledStart ?? notice.requestedStart);
  await Promise.allSettled([sendMail({ to: notice.customerEmail, subject: `${notice.reference}: booking ${status}`, text: `${notice.storeName} updated your ${notice.serviceName} booking to ${status}. Appointment: ${when}. ${notice.note ?? ""} Track it at ${siteUrl()}/account`, html: html(`Booking ${status}`, `${notice.storeName} updated your service booking.`, notice, "View booking", `${siteUrl()}/account`) })]);
}

export async function sendBookingCancelledToMerchant(notice: BookingNotice) {
  if (!notice.merchantEmail) return;
  await Promise.allSettled([sendMail({ to: notice.merchantEmail, subject: `${notice.reference} cancelled by customer`, text: `${notice.customerName} cancelled ${notice.serviceName}. View bookings at ${siteUrl()}/`, html: html("Booking cancelled", `${notice.customerName} cancelled this service booking.`, notice, "Open bookings", `${siteUrl()}/`) })]);
}

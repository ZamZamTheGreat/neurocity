import { sendMail } from "./mail";
import { emailPanel, escapeEmailHtml as escapeHtml, neuroCityEmail, neuroCityUrl } from "./email-template";

export type BookingNotice = { reference: string; serviceName: string; storeName: string; customerName: string; customerEmail: string; merchantEmail?: string | null; status: string; requestedStart: Date; scheduledStart?: Date | null; durationMinutes?: number | null; serviceMode?: string | null; price?: number | null; pricingModel?: string; note?: string | null };
const siteUrl = neuroCityUrl;
const words = (value: string) => value.replaceAll("_", " ");
const dateTime = (value: Date) => value.toLocaleString("en-NA", { timeZone: "Africa/Windhoek", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
const price = (notice: BookingNotice) => notice.pricingModel === "quote" || notice.price == null ? "Quote required" : `N$${Number(notice.price).toFixed(2)}`;
function html(title: string, intro: string, notice: BookingNotice, action: string, url: string) { const scheduled = notice.scheduledStart ?? notice.requestedStart; const detail = `<b style="color:#07111f">${escapeHtml(notice.reference)} · ${escapeHtml(notice.serviceName)}</b><br>${escapeHtml(notice.storeName)}<br><span>${escapeHtml(dateTime(scheduled))}${notice.durationMinutes ? ` · ${notice.durationMinutes} minutes` : ""}</span><br><span style="text-transform:capitalize">${escapeHtml(words(notice.serviceMode ?? "at_business"))} · ${escapeHtml(price(notice))}</span>${notice.note ? `<p style="margin:10px 0 0;color:#59646a">${escapeHtml(notice.note)}</p>` : ""}`; return neuroCityEmail({ eyebrow: "SERVICE BOOKING", title, intro, bodyHtml: emailPanel(detail, true), actionLabel: action, actionUrl: url, footerNote: "This is an automatic NeuroCity booking notification." }); }

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

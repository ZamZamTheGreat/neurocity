import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, dataBreachIncidents, dataBreachNotifications, users } from "../../../../db/schema";
import { sendMail } from "../../../../lib/mail";
import { isSameOriginMutation, readBoundedBody } from "../../../../lib/request-security";
import { getChatGPTUser } from "../../../chatgpt-auth";

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);

async function administrator() {
  const user = await getChatGPTUser();
  return user?.platformRole === "administrator" ? user : null;
}

async function bodyFrom(request: Request) {
  if (!isSameOriginMutation(request)) throw new Error("Invalid request origin.");
  return JSON.parse(new TextDecoder().decode(await readBoundedBody(request, 24_000))) as Record<string, unknown>;
}

export async function GET() {
  if (!await administrator()) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const incidents = await getDb().select().from(dataBreachIncidents).orderBy(desc(dataBreachIncidents.detectedAt)).limit(50);
  return Response.json({ incidents }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const actor = await administrator();
  if (!actor) return Response.json({ error: "Administrator access required." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await bodyFrom(request); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid request." }, { status: 400 }); }
  const title = clean(body.title, 180);
  const nature = clean(body.nature, 4000);
  const likelyConsequences = clean(body.likelyConsequences, 4000);
  const measuresTaken = clean(body.measuresTaken, 4000);
  const contactEmail = clean(body.contactEmail, 320).toLowerCase();
  const riskLevel = clean(body.riskLevel, 24);
  const detectedAt = new Date(clean(body.detectedAt, 40));
  const requestedEmails = [...new Set(clean(body.affectedEmails, 20_000).split(/[\s,;]+/).map((email) => email.toLowerCase()).filter(Boolean))].slice(0, 1000);
  if (!title || !nature || !likelyConsequences || !measuresTaken || !/^\S+@\S+\.\S+$/.test(contactEmail) || Number.isNaN(detectedAt.getTime()) || !["under_assessment", "low", "risk", "high_risk"].includes(riskLevel)) {
    return Response.json({ error: "Complete every incident field with a valid detection time, contact and risk assessment." }, { status: 400 });
  }
  if (!requestedEmails.length) return Response.json({ error: "Add at least one affected registered-user email." }, { status: 400 });
  const affected = await getDb().select({ id: users.id, email: users.email }).from(users).where(inArray(users.email, requestedEmails));
  if (affected.length !== requestedEmails.length) return Response.json({ error: `${requestedEmails.length - affected.length} email address(es) do not belong to registered users. Correct the list before saving.` }, { status: 400 });
  const db = getDb();
  const incident = await db.transaction(async (tx) => {
    const [created] = await tx.insert(dataBreachIncidents).values({ title, detectedAt, nature, likelyConsequences, measuresTaken, contactEmail, riskLevel, affectedUserIds: affected.map((item) => item.id), createdBy: actor.userId }).returning();
    await tx.insert(dataBreachNotifications).values(affected.map((item) => ({ incidentId: created.id, userId: item.id })));
    await tx.insert(auditEvents).values({ actorRef: actor.userId, action: "privacy.breach_recorded", resourceType: "data_breach", resourceId: String(created.id), metadata: { riskLevel, affectedCount: affected.length, detectedAt: detectedAt.toISOString() } });
    return created;
  });
  return Response.json({ incident }, { status: 201 });
}

export async function PATCH(request: Request) {
  const actor = await administrator();
  if (!actor) return Response.json({ error: "Administrator access required." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await bodyFrom(request); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid request." }, { status: 400 }); }
  const incidentId = Number(body.incidentId);
  const action = clean(body.action, 30);
  const db = getDb();
  const [incident] = Number.isInteger(incidentId) ? await db.select().from(dataBreachIncidents).where(eq(dataBreachIncidents.id, incidentId)).limit(1) : [];
  if (!incident) return Response.json({ error: "Incident not found." }, { status: 404 });

  if (action === "authority") {
    const reference = clean(body.authorityReference, 180);
    const notifiedAt = new Date(clean(body.authorityNotifiedAt, 40));
    if (!reference || Number.isNaN(notifiedAt.getTime())) return Response.json({ error: "Add the authority reference and notification time." }, { status: 400 });
    const [updated] = await db.update(dataBreachIncidents).set({ authorityReference: reference, authorityNotifiedAt: notifiedAt, updatedAt: new Date() }).where(eq(dataBreachIncidents.id, incident.id)).returning();
    await db.insert(auditEvents).values({ actorRef: actor.userId, action: "privacy.breach_authority_notified", resourceType: "data_breach", resourceId: String(incident.id), metadata: { reference, notifiedAt: notifiedAt.toISOString() } });
    return Response.json({ incident: updated });
  }

  if (action !== "notify") return Response.json({ error: "Choose a valid incident action." }, { status: 400 });
  const recipients = await db.select({ notificationId: dataBreachNotifications.id, attempts: dataBreachNotifications.attempts, id: users.id, email: users.email, displayName: users.displayName }).from(dataBreachNotifications).innerJoin(users, eq(users.id, dataBreachNotifications.userId)).where(and(eq(dataBreachNotifications.incidentId, incident.id), ne(dataBreachNotifications.status, "delivered")));
  if (!recipients.length) return Response.json({ error: "All affected users were already notified for this incident." }, { status: 409 });
  const subject = `Important privacy notice from NeuroCity: ${incident.title}`;
  const deliveries = await Promise.allSettled(recipients.map((recipient) => sendMail({
    to: recipient.email,
    subject,
    replyTo: incident.contactEmail,
    text: `Hello ${recipient.displayName},\n\nWe are writing to tell you about a personal data incident that may affect you.\n\nWhat happened\n${incident.nature}\n\nPossible consequences\n${incident.likelyConsequences}\n\nWhat we have done and what you can do\n${incident.measuresTaken}\n\nQuestions: ${incident.contactEmail}\n\nNeuroCity`,
    html: `<div style="max-width:620px;margin:auto;font-family:Arial,sans-serif;color:#18201c"><h1 style="font-size:24px">Important privacy notice</h1><p>Hello ${escapeHtml(recipient.displayName)},</p><p>We are writing to tell you about a personal data incident that may affect you.</p><h2 style="font-size:17px">What happened</h2><p style="white-space:pre-line">${escapeHtml(incident.nature)}</p><h2 style="font-size:17px">Possible consequences</h2><p style="white-space:pre-line">${escapeHtml(incident.likelyConsequences)}</p><h2 style="font-size:17px">What we have done and what you can do</h2><p style="white-space:pre-line">${escapeHtml(incident.measuresTaken)}</p><p>Questions can be sent to <a href="mailto:${escapeHtml(incident.contactEmail)}">${escapeHtml(incident.contactEmail)}</a>.</p><p><b>NeuroCity</b></p></div>`,
  })));
  const failed = deliveries.filter((result) => result.status === "rejected" || (result.status === "fulfilled" && !result.value.delivered)).length;
  const notifiedAt = new Date();
  await Promise.all(recipients.map((recipient, index) => db.update(dataBreachNotifications).set({ status: deliveries[index].status === "fulfilled" && deliveries[index].value.delivered ? "delivered" : "failed", attempts: recipient.attempts + 1, lastAttemptAt: notifiedAt, deliveredAt: deliveries[index].status === "fulfilled" && deliveries[index].value.delivered ? notifiedAt : null }).where(eq(dataBreachNotifications.id, recipient.notificationId))));
  const [updated] = await db.update(dataBreachIncidents).set({ status: failed ? "notification_incomplete" : "notified", notificationAttempts: incident.notificationAttempts + recipients.length, notificationFailures: failed, notifiedAt: failed ? null : notifiedAt, updatedAt: notifiedAt }).where(eq(dataBreachIncidents.id, incident.id)).returning();
  await db.insert(auditEvents).values({ actorRef: actor.userId, action: failed ? "privacy.breach_notification_incomplete" : "privacy.breach_users_notified", resourceType: "data_breach", resourceId: String(incident.id), metadata: { attempted: recipients.length, failed } });
  return Response.json({ incident: updated, attempted: recipients.length, failed });
}

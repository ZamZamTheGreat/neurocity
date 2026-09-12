const escapeMap: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
export const escapeEmailHtml = (value: string) => value.replace(/[&<>"']/g, (character) => escapeMap[character]);
export const neuroCityUrl = () => (process.env.PUBLIC_SITE_URL ?? process.env.APP_URL ?? "https://neurocity.city").replace(/\/$/, "");

type EmailLayout = {
  eyebrow?: string;
  title: string;
  intro?: string;
  bodyHtml?: string;
  actionLabel?: string;
  actionUrl?: string;
  footerNote?: string;
  preheader?: string;
  tone?: "standard" | "urgent";
};

export function emailPanel(content: string, accent = false) {
  return `<div style="margin:20px 0 0;padding:18px;border:1px solid ${accent ? "#ead8a5" : "#e5e1d8"};border-radius:12px;background:${accent ? "#fffaf0" : "#f8f7f3"};color:#273139;line-height:1.65">${content}</div>`;
}

export function neuroCityEmail({ eyebrow = "NEUROCITY UPDATE", title, intro, bodyHtml = "", actionLabel, actionUrl, footerNote = "This message was sent automatically by NeuroCity.", preheader, tone = "standard" }: EmailLayout) {
  const base = neuroCityUrl();
  const accent = tone === "urgent" ? "#b64436" : "#d2a83e";
  const safeActionUrl = actionUrl ? escapeEmailHtml(actionUrl) : "";
  return `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeEmailHtml(title)}</title></head><body style="margin:0;padding:0;background:#f2f0ea;color:#17212a;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeEmailHtml(preheader ?? intro ?? title)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f2f0ea"><tr><td align="center" style="padding:30px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid #ddd8cc;border-radius:18px;background:#ffffff;box-shadow:0 12px 34px rgba(7,17,31,.08)"><tr><td style="padding:22px 26px;background:#07111f"><table role="presentation" width="100%"><tr><td><a href="${escapeEmailHtml(base)}" style="color:#fff;text-decoration:none;font-size:23px;font-weight:800;letter-spacing:-.6px">NEURO<span style="color:#dfb748">CITY</span></a><div style="margin-top:4px;color:#9eabb4;font-size:10px;letter-spacing:1.2px;text-transform:uppercase">Namibia’s connected shopping network</div></td><td align="right" style="color:#dfb748;font-size:11px;font-weight:700">NEUROEDGE</td></tr></table></td></tr><tr><td style="height:4px;background:${accent}"></td></tr><tr><td style="padding:32px 28px 30px"><div style="margin:0 0 10px;color:${accent};font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase">${escapeEmailHtml(eyebrow)}</div><h1 style="margin:0;color:#07111f;font-size:28px;line-height:1.18;letter-spacing:-.5px">${escapeEmailHtml(title)}</h1>${intro ? `<p style="margin:14px 0 0;color:#56616a;font-size:15px;line-height:1.7">${escapeEmailHtml(intro)}</p>` : ""}${bodyHtml}${actionLabel && safeActionUrl ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px"><tr><td style="border-radius:9px;background:#07111f"><a href="${safeActionUrl}" style="display:inline-block;padding:14px 20px;color:#fff;text-decoration:none;font-size:14px;font-weight:800">${escapeEmailHtml(actionLabel)} &nbsp;→</a></td></tr></table><p style="margin:12px 0 0;color:#8a908f;font-size:10px;line-height:1.5">If the button does not work, copy this address into your browser:<br><a href="${safeActionUrl}" style="color:#80601d;word-break:break-all">${safeActionUrl}</a></p>` : ""}<div style="margin-top:30px;padding-top:18px;border-top:1px solid #ece8df;color:#858b89;font-size:11px;line-height:1.6">${escapeEmailHtml(footerNote)}</div></td></tr><tr><td style="padding:18px 28px;background:#f8f7f3;color:#777e7c;font-size:10px;line-height:1.7"><b style="color:#303a41">NeuroCity · Namibia</b><br><a href="${escapeEmailHtml(base)}/privacy" style="color:#80601d">Privacy</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${escapeEmailHtml(base)}/terms" style="color:#80601d">Terms</a></td></tr></table></td></tr></table></body></html>`;
}

export function plainTextEmailHtml(subject: string, text: string) {
  const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const intro = paragraphs.shift() ?? "A new update is available.";
  const bodyHtml = paragraphs.length ? paragraphs.map((paragraph) => `<p style="margin:16px 0 0;color:#56616a;font-size:14px;line-height:1.7;white-space:pre-line">${escapeEmailHtml(paragraph)}</p>`).join("") : "";
  return neuroCityEmail({ title: subject, intro, bodyHtml });
}

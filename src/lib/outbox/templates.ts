import {z} from "zod";

import type {ClaimedOutboxMessage} from "@/lib/outbox/worker";

export type RenderedOutboxMail = {
  subject: string;
  text: string;
  html: string;
};

const ContentReviewPayloadSchema = z.object({
  resourceId: z.string().min(1).max(191).regex(/^[^\u0000-\u001F\u007F]+$/),
}).strict();
const EmptyPayloadSchema = z.object({}).strict();

const COPY = {
  id: {
    subject: "Pengingat peninjauan konten FUSPI",
    heading: "Konten perlu ditinjau",
    body: "Konten FUSPI berikut telah memasuki jadwal peninjauan:",
    label: "ID konten",
  },
  en: {
    subject: "FUSPI content review reminder",
    heading: "Content review required",
    body: "The following FUSPI content is due for review:",
    label: "Content ID",
  },
  ar: {
    subject: "تذكير بمراجعة محتوى FUSPI",
    heading: "المحتوى بحاجة إلى مراجعة",
    body: "حان موعد مراجعة محتوى FUSPI التالي:",
    label: "معرّف المحتوى",
  },
} as const;

const PPKS_COPY = {
  id: {
    subject: "Ada laporan sensitif baru",
    heading: "Laporan sensitif baru diterima",
    body: "Ada laporan baru pada kanal terlindungi. Silakan masuk ke panel FUSPI untuk meninjaunya.",
  },
  en: {
    subject: "New sensitive report received",
    heading: "New sensitive report received",
    body: "A new report arrived in the protected channel. Please sign in to the FUSPI admin panel to review it.",
  },
  ar: {
    subject: "تم استلام بلاغ حساس جديد",
    heading: "تم استلام بلاغ حساس جديد",
    body: "وصل بلاغ جديد في القناة المحمية. يرجى تسجيل الدخول إلى لوحة FUSPI لمراجعته.",
  },
} as const;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderOutboxMail(
  message: Readonly<ClaimedOutboxMessage>,
): RenderedOutboxMail {
  if (message.payloadEncrypted) {
    throw new Error("Unable to render outbox message.");
  }
  const direction = message.locale === "ar" ? "rtl" : "ltr";
  if (message.template === "ppks-report-received") {
    EmptyPayloadSchema.parse(message.payload);
    const copy = PPKS_COPY[message.locale];
    return Object.freeze({
      subject: copy.subject,
      text: `${copy.heading}\n\n${copy.body}\n`,
      html:
        `<!doctype html><html lang="${message.locale}" dir="${direction}">` +
        `<body><h1>${copy.heading}</h1><p>${copy.body}</p></body></html>`,
    });
  }

  if (message.template !== "content-review-due") {
    throw new Error("Unable to render outbox message.");
  }
  const payload = ContentReviewPayloadSchema.parse(message.payload);
  const copy = COPY[message.locale];
  const resourceId = escapeHtml(payload.resourceId);

  return Object.freeze({
    subject: copy.subject,
    text: `${copy.heading}\n\n${copy.body}\n${copy.label}: ${payload.resourceId}\n`,
    html:
      `<!doctype html><html lang="${message.locale}" dir="${direction}">` +
      `<body><h1>${copy.heading}</h1><p>${copy.body}</p>` +
      `<p><strong>${copy.label}:</strong> ${resourceId}</p></body></html>`,
  });
}

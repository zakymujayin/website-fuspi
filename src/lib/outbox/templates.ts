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
  if (message.payloadEncrypted || message.template !== "content-review-due") {
    throw new Error("Unable to render outbox message.");
  }
  const payload = ContentReviewPayloadSchema.parse(message.payload);
  const copy = COPY[message.locale];
  const resourceId = escapeHtml(payload.resourceId);
  const direction = message.locale === "ar" ? "rtl" : "ltr";

  return Object.freeze({
    subject: copy.subject,
    text: `${copy.heading}\n\n${copy.body}\n${copy.label}: ${payload.resourceId}\n`,
    html:
      `<!doctype html><html lang="${message.locale}" dir="${direction}">` +
      `<body><h1>${copy.heading}</h1><p>${copy.body}</p>` +
      `<p><strong>${copy.label}:</strong> ${resourceId}</p></body></html>`,
  });
}

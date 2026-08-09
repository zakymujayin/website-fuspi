import {describe, expect, it, vi} from "vitest";

import {formatOutboxProcessResult} from "../../scripts/process-outbox";
import {
  SmtpDeliveryError,
  buildSmtpTransportOptions,
  createSmtpOutboxSender,
  parseSmtpOutboxEnvironment,
  type SmtpRuntimeConfig,
} from "@/lib/outbox/smtp";
import {renderOutboxMail} from "@/lib/outbox/templates";
import type {ClaimedOutboxMessage} from "@/lib/outbox/worker";

const smtpConfig: SmtpRuntimeConfig = {
  host: "smtp.example.test",
  port: 587,
  secure: false,
  user: "mailer@example.test",
  password: "synthetic-password",
  from: "FUSPI <mailer@example.test>",
  timeoutMs: 8_000,
};

function message(
  overrides: Partial<ClaimedOutboxMessage> = {},
): ClaimedOutboxMessage {
  return {
    id: "message-1",
    type: "CONTENT_REVIEW_DUE",
    recipient: "owner@example.test",
    locale: "id",
    template: "content-review-due",
    payload: {resourceId: "page-1"},
    payloadEncrypted: false,
    payloadCiphertext: null,
    encryptionNonce: null,
    encryptionTag: null,
    keyVersion: null,
    idempotencyKey: "review:page-1:2026-W29",
    attempts: 1,
    ...overrides,
  };
}

describe("SMTP outbox adapter", () => {
  it("parses strict SMTP and bounded worker environment", () => {
    const parsed = parseSmtpOutboxEnvironment({
      SMTP_HOST: "smtp.example.test",
      SMTP_PORT: "465",
      SMTP_SECURE: "true",
      SMTP_USER: "mailer@example.test",
      SMTP_PASSWORD: "secret",
      MAIL_FROM: "FUSPI <mailer@example.test>",
      SMTP_TIMEOUT_MS: "9000",
      OUTBOX_WORKER_ID: "worker_01",
    });
    expect(parsed.smtp).toMatchObject({port: 465, secure: true, timeoutMs: 9_000});
    expect(parsed.worker).toEqual({
      workerId: "worker_01",
      batchSize: 25,
      lockTimeoutMs: 300_000,
      maxAttempts: 5,
      baseBackoffMs: 60_000,
      maxBackoffMs: 3_600_000,
    });
    expect(() => parseSmtpOutboxEnvironment({
      SMTP_HOST: "smtp.example.test\r\nBAD",
      SMTP_PORT: "465",
      SMTP_SECURE: "yes",
      SMTP_USER: "mailer@example.test",
      SMTP_PASSWORD: "secret",
      MAIL_FROM: "mailer@example.test",
      OUTBOX_WORKER_ID: "worker_01",
    })).toThrow();
  });

  it("requires STARTTLS and bounded timeouts when implicit TLS is disabled", () => {
    expect(buildSmtpTransportOptions(smtpConfig)).toMatchObject({
      secure: false,
      requireTLS: true,
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 8_000,
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true,
      tls: {rejectUnauthorized: true, minVersion: "TLSv1.2"},
    });
  });

  it.each([
    ["id", "Pengingat peninjauan konten FUSPI", 'dir="ltr"'],
    ["en", "FUSPI content review reminder", 'dir="ltr"'],
    ["ar", "تذكير بمراجعة محتوى FUSPI", 'dir="rtl"'],
  ] as const)("renders the allowlisted %s template", (locale, subject, direction) => {
    const rendered = renderOutboxMail(message({locale}));
    expect(rendered.subject).toBe(subject);
    expect(rendered.html).toContain(direction);
    expect(rendered.text).toContain("page-1");
  });

  it("escapes interpolated HTML and rejects unknown or encrypted templates", () => {
    const rendered = renderOutboxMail(message({payload: {resourceId: "<script>alert(1)</script>"}}));
    expect(rendered.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(rendered.html).not.toContain("<script>");
    expect(() => renderOutboxMail(message({template: "unknown"}))).toThrow(
      "Unable to render outbox message.",
    );
    expect(() => renderOutboxMail(message({payloadEncrypted: true}))).toThrow(
      "Unable to render outbox message.",
    );
  });

  it("sends only rendered fields without technical or idempotency headers", async () => {
    const sendMail = vi.fn().mockResolvedValue({accepted: ["owner@example.test"]});
    const sender = createSmtpOutboxSender({config: smtpConfig, transport: {sendMail}});
    await sender.send(message());
    expect(sendMail).toHaveBeenCalledOnce();
    const options = sendMail.mock.calls[0]?.[0];
    expect(options).toMatchObject({
      from: smtpConfig.from,
      to: "owner@example.test",
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    expect(options).not.toHaveProperty("headers");
    expect(options).not.toHaveProperty("envelope");
    expect(JSON.stringify(options)).not.toContain("review:page-1:2026-W29");
  });

  it("collapses invalid recipients and provider failures to one generic error", async () => {
    const sendMail = vi.fn().mockRejectedValue(
      new Error("SMTP password leaked with owner@example.test"),
    );
    const sender = createSmtpOutboxSender({config: smtpConfig, transport: {sendMail}});
    await expect(sender.send(message())).rejects.toEqual(new SmtpDeliveryError());
    await expect(sender.send(message({recipient: "bad\r\nBcc: victim@example.test"})))
      .rejects.toEqual(new SmtpDeliveryError());
    expect(sendMail).toHaveBeenCalledOnce();
  });

  it("formats runner output as aggregate counters only", () => {
    const output = formatOutboxProcessResult({
      claimed: 4,
      sent: 3,
      failed: 1,
      ownershipLost: 0,
    });
    expect(output).toEqual({claimed: 4, sent: 3, failed: 1, ownershipLost: 0});
    expect(Object.keys(output)).toEqual(["claimed", "sent", "failed", "ownershipLost"]);
  });
});

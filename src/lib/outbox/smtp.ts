import {createRequire} from "node:module";

import type SMTPTransport from "nodemailer/lib/smtp-transport";
import {z} from "zod";

import {
  SmtpOutboxEnvironmentSchema,
  type SmtpOutboxEnvironment,
} from "@/contracts/platform";
import {renderOutboxMail, type RenderedOutboxMail} from "@/lib/outbox/templates";
import type {ClaimedOutboxMessage, OutboxSender} from "@/lib/outbox/worker";

const require = createRequire(import.meta.url);
const nodemailer = require("fuspi-nodemailer") as typeof import("nodemailer");

const RecipientSchema = z.string().trim().email().max(320);

export class SmtpDeliveryError extends Error {
  constructor() {
    super("Unable to deliver outbox message.");
    this.name = "SmtpDeliveryError";
  }
}

export type SmtpTransportLike = {
  sendMail(options: SMTPTransport.Options): Promise<unknown>;
};

export type SmtpRuntimeConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  timeoutMs: number;
};

export function parseSmtpOutboxEnvironment(
  environment: Record<string, string | undefined>,
) {
  const parsed = SmtpOutboxEnvironmentSchema.parse(environment);
  return Object.freeze({
    smtp: Object.freeze({
      host: parsed.SMTP_HOST,
      port: parsed.SMTP_PORT,
      secure: parsed.SMTP_SECURE,
      user: parsed.SMTP_USER,
      password: parsed.SMTP_PASSWORD,
      from: parsed.MAIL_FROM,
      timeoutMs: parsed.SMTP_TIMEOUT_MS,
    }),
    worker: Object.freeze({
      workerId: parsed.OUTBOX_WORKER_ID,
      batchSize: parsed.OUTBOX_BATCH_SIZE,
      lockTimeoutMs: parsed.OUTBOX_LOCK_TIMEOUT_MS,
      maxAttempts: 5 as const,
      baseBackoffMs: parsed.OUTBOX_BASE_BACKOFF_MS,
      maxBackoffMs: parsed.OUTBOX_MAX_BACKOFF_MS,
    }),
  });
}

export function buildSmtpTransportOptions(
  config: SmtpRuntimeConfig,
): SMTPTransport.Options {
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: {user: config.user, pass: config.password},
    connectionTimeout: config.timeoutMs,
    greetingTimeout: config.timeoutMs,
    socketTimeout: config.timeoutMs,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
    tls: {rejectUnauthorized: true, minVersion: "TLSv1.2"},
  };
}

export function createSmtpOutboxSender(input: {
  config: SmtpRuntimeConfig;
  transport?: SmtpTransportLike;
  render?: (message: Readonly<ClaimedOutboxMessage>) => RenderedOutboxMail;
}): OutboxSender {
  const transport =
    input.transport ?? nodemailer.createTransport(buildSmtpTransportOptions(input.config));
  const render = input.render ?? renderOutboxMail;

  return {
    async send(message) {
      try {
        const recipient = RecipientSchema.parse(message.recipient);
        const mail = render(message);
        await transport.sendMail({
          from: input.config.from,
          to: recipient,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          disableFileAccess: true,
          disableUrlAccess: true,
        });
      } catch {
        throw new SmtpDeliveryError();
      }
    },
  };
}

export type {SmtpOutboxEnvironment};

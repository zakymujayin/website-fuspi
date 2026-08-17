import {describe, expect, it} from "vitest";

import {prepareRevision} from "@/lib/db/revision";
import {prepareOutboxMessage} from "@/lib/outbox/enqueue";

describe("content revision contract", () => {
  it("creates deterministic root and locale scopes", () => {
    const root = prepareRevision({
      resourceType: "Page",
      resourceId: "page-1",
      version: 2,
      snapshot: {title: "Profil"},
    });
    const arabic = prepareRevision({
      resourceType: "Page",
      resourceId: "page-1",
      locale: "ar",
      version: 2,
      snapshot: {title: "الملف التعريفي"},
    });

    expect(root.scopeKey).toBe("root");
    expect(arabic.scopeKey).toBe("ar");
  });

  it("allows Facility revisions for admin-managed facilities", () => {
    const revision = prepareRevision({
      resourceType: "Facility",
      resourceId: "facility-1",
      version: 1,
      snapshot: {slug: "aula-fuspi", type: "AULA", isActive: true},
    });

    expect(revision.resourceType).toBe("Facility");
    expect(revision.scopeKey).toBe("root");
  });

  it("rejects operational resources and sensitive snapshot fields", () => {
    expect(() =>
      prepareRevision({
        resourceType: "Ticket",
        resourceId: "ticket-1",
        version: 1,
        snapshot: {status: "BARU"},
      }),
    ).toThrow("not permitted");

    expect(() =>
      prepareRevision({
        resourceType: "Post",
        resourceId: "post-1",
        version: 1,
        snapshot: {trackingToken: "raw"},
      }),
    ).toThrow("forbidden data");
  });

  it("rejects sensitive snapshot fields nested inside objects and arrays", () => {
    expect(() =>
      prepareRevision({
        resourceType: "Post",
        resourceId: "post-1",
        version: 1,
        snapshot: {
          metadata: {blocks: [{content: {passwordHash: "must-not-persist"}}]},
        },
      }),
    ).toThrow("snapshot.metadata.blocks[0].content.passwordHash");
  });

  it("rejects snapshots that are not JSON serializable", () => {
    const snapshot: Record<string, unknown> = {};
    snapshot.circular = snapshot;

    expect(() =>
      prepareRevision({
        resourceType: "Page",
        resourceId: "page-1",
        version: 1,
        snapshot,
      }),
    ).toThrow("JSON serializable");
  });
});

describe("notification outbox contract", () => {
  it("keeps ordinary template payload as JSON", () => {
    const message = prepareOutboxMessage({
      sensitive: false,
      type: "CONTENT_REVIEW_DUE",
      recipient: "owner@example.invalid",
      locale: "id",
      template: "content-review-due",
      idempotencyKey: "review:page-1:2026-W28",
      payload: {resourceId: "page-1"},
    });

    expect(message.payloadEncrypted).toBe(false);
    expect(message.payload).toEqual({resourceId: "page-1"});
    expect(message.payloadCiphertext).toBeNull();
  });

  it("stores sensitive payload only as an encrypted envelope", () => {
    const message = prepareOutboxMessage({
      sensitive: true,
      type: "PRIVACY_REQUEST",
      recipient: "privacy@example.invalid",
      locale: "id",
      template: "privacy-request",
      idempotencyKey: "privacy:request-1:received",
      encryptedPayload: {
        ciphertext: "ciphertext",
        nonce: "nonce",
        tag: "tag",
        keyVersion: 1,
      },
    });

    expect(message.payloadEncrypted).toBe(true);
    expect(message.payload).toBeUndefined();
    expect(message.payloadCiphertext).toBe("ciphertext");
  });

  it("rejects sensitive keys from plaintext payloads", () => {
    expect(() =>
      prepareOutboxMessage({
        sensitive: false,
        type: "PRIVACY_REQUEST",
        recipient: "privacy@example.invalid",
        template: "privacy-request",
        idempotencyKey: "privacy:request-2:received",
        payload: {trackingToken: "raw-token"},
      }),
    ).toThrow("must use an encrypted payload");
  });
});

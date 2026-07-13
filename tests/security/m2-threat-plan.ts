export type TestLevel = "unit" | "integration" | "e2e";

export interface M2SecurityTestCase {
  id: string;
  area: string;
  severity: "critical" | "high" | "medium" | "low";
  actor: string;
  precondition: string;
  attack: string;
  invariant: string;
  expectedOutcome: string;
  requiredFixture: string;
  dependsOn: string;
  testLevel: TestLevel;
}

const plan: M2SecurityTestCase[] = [
  // =========================================================
  // AUTH — Session Revocation & Inactive Users
  // =========================================================
  {
    id: "M2-AUTH-001",
    area: "Session Revocation",
    severity: "critical",
    actor: "System (background job)",
    precondition:
      "User has 3 active sessions across devices. Password is changed by ADMIN or user.",
    attack:
      "After password change, send requests with all 3 old session cookies.",
    invariant:
      "Password change must delete every Session row for that user in the same transaction.",
    expectedOutcome:
      "All 3 sessions rejected with 401. New login with new password succeeds.",
    requiredFixture:
      "synthetic-user with 3 Session rows in DB, distinct sessionToken values",
    dependsOn: "auth.session-revocation",
    testLevel: "integration",
  },
  {
    id: "M2-AUTH-002",
    area: "Session Revocation",
    severity: "critical",
    actor: "ADMIN",
    precondition:
      "User is EDITOR with active session. ADMIN deactivates the user (isActive=false).",
    attack:
      "Request admin endpoint with the deactivated user's session cookie.",
    invariant:
      "Deactivation must delete all Session rows AND active session check must re-verify isActive per request.",
    expectedOutcome:
      "Deactivated user's session returns 401. User cannot re-login (isActive check in authorize).",
    requiredFixture:
      "synthetic-editor with active Session, ADMIN session for deactivation action",
    dependsOn: "auth.session-revocation",
    testLevel: "integration",
  },
  {
    id: "M2-AUTH-003",
    area: "Session Revocation",
    severity: "critical",
    actor: "ADMIN",
    precondition:
      "User is EDITOR with active session. ADMIN changes user's role from EDITOR to PETUGAS.",
    attack:
      "Request /admin/berita with the role-changed user's session cookie.",
    invariant:
      "Role change must delete all Session rows AND session must carry the old role until re-login.",
    expectedOutcome:
      "Old session rejected. After re-login, user has PETUGAS permissions, not EDITOR.",
    requiredFixture:
      "synthetic-editor with Session, ADMIN session for role-change action",
    dependsOn: "auth.session-revocation",
    testLevel: "integration",
  },
  {
    id: "M2-AUTH-004",
    area: "Session Revocation",
    severity: "high",
    actor: "Attacker (stolen cookie)",
    precondition:
      "Attacker possesses a valid session token. Victim changes password.",
    attack:
      "Replay the stolen session cookie against admin endpoints after password change.",
    invariant:
      "Password change must revoke ALL sessions atomically with the password update.",
    expectedOutcome:
      "Stolen cookie returns 401. New session for victim works after re-login.",
    requiredFixture: "synthetic-user Session row, attacker replay harness",
    dependsOn: "auth.session-revocation",
    testLevel: "integration",
  },
  {
    id: "M2-AUTH-005",
    area: "Inactive User",
    severity: "high",
    actor: "Inactive user (former EDITOR)",
    precondition:
      "User isActive=false in database but still holds a session cookie issued before deactivation.",
    attack:
      "Send authenticated request to any admin endpoint with the stale cookie.",
    invariant:
      "Every request must check user.isActive. Session validity alone is insufficient.",
    expectedOutcome: "Request returns 401. Cookie is effectively dead.",
    requiredFixture: "synthetic-inactive-user with persisted Session row",
    dependsOn: "auth.session-revocation",
    testLevel: "integration",
  },

  // =========================================================
  // AUTH — Login Enumeration & Rate Limiting
  // =========================================================
  {
    id: "M2-AUTH-006",
    area: "Login Enumeration",
    severity: "high",
    actor: "Attacker (unauthenticated)",
    precondition: "No prior failed attempts from this IP-hash.",
    attack:
      "Send 6 login attempts with different passwords to the same email within 15 minutes.",
    invariant:
      "Rate limit enforced per HMAC(IP) AND per HMAC(email). Error message identical for invalid email and wrong password.",
    expectedOutcome:
      "First 5 attempts return generic error. 6th returns generic 429. No response reveals whether email exists.",
    requiredFixture: "synthetic-admin user, precompute HMAC keys",
    dependsOn: "auth.rate-limit",
    testLevel: "integration",
  },
  {
    id: "M2-AUTH-007",
    area: "Login Enumeration",
    severity: "medium",
    actor: "Attacker (unauthenticated)",
    precondition: "Valid email exists. Attacker tries non-existent email.",
    attack:
      "Submit login with `nonexistent@example.invalid` and with `admin@fuspi.uinbanten.ac.id` using wrong password. Compare responses.",
    invariant:
      "Response status, body, timing, and headers must be indistinguishable between valid-email-wrong-password and invalid-email cases.",
    expectedOutcome:
      "Both return identical error body with HTTP 200 or 401 and no timing side-channel.",
    requiredFixture: "synthetic-admin user",
    dependsOn: "auth.rate-limit",
    testLevel: "integration",
  },

  // =========================================================
  // IDOR — Role & Ownership Enforcement
  // =========================================================
  {
    id: "M2-IDOR-001",
    area: "Ownership IDOR",
    severity: "critical",
    actor: "EDITOR-A",
    precondition:
      "EDITOR-A and EDITOR-B each own one Post. Both are logged in.",
    attack:
      "EDITOR-A directly calls the update/delete/publish action with EDITOR-B's post ID.",
    invariant:
      "EDITOR may only mutate posts where authorId === session.user.id. ADMIN bypass is explicit, not implicit.",
    expectedOutcome:
      "Action returns 403. EDITOR-B's post is unchanged. Audit log records the rejected attempt.",
    requiredFixture:
      "two synthetic-editors each owning one Post with distinct IDs",
    dependsOn: "lib.authorization",
    testLevel: "integration",
  },
  {
    id: "M2-IDOR-002",
    area: "Role Escalation",
    severity: "critical",
    actor: "EDITOR",
    precondition: "EDITOR is logged in with a valid session.",
    attack:
      "EDITOR sends a request to update their own role field to ADMIN.",
    invariant:
      "Role changes are restricted to ADMIN only. No user may self-escalate.",
    expectedOutcome: "Request returns 403. User role remains EDITOR in DB.",
    requiredFixture: "synthetic-editor user, user-update action endpoint",
    dependsOn: "lib.authorization",
    testLevel: "integration",
  },
  {
    id: "M2-IDOR-003",
    area: "PPKS IDOR",
    severity: "critical",
    actor: "ADMIN",
    precondition:
      "A PPKS ticket exists. ADMIN has an active session.",
    attack:
      "ADMIN directly requests GET /api/admin/tickets/{ppks-ticket-id} or the PPKS detail Server Action.",
    invariant:
      "Tickets with category PELECEHAN_SEKSUAL must be filtered at query level for non-SATGAS_PPKS roles. ADMIN sees only aggregate counts.",
    expectedOutcome:
      "Request returns 403 or empty/redacted payload. PPKS subject, description, identity, and attachment URLs are never exposed.",
    requiredFixture: "synthetic-ppks-ticket with attachments, ADMIN session",
    dependsOn: "lib.authorization",
    testLevel: "integration",
  },
  {
    id: "M2-IDOR-004",
    area: "PPKS IDOR",
    severity: "critical",
    actor: "PETUGAS",
    precondition:
      "A PPKS ticket exists assigned to SATGAS_PPKS. PETUGAS has an active session.",
    attack:
      "PETUGAS requests the PPKS attachment download endpoint by guessing attachment ID.",
    invariant:
      "PPKS attachment streams require SATGAS_PPKS role. PETUGAS must be rejected before any file read occurs.",
    expectedOutcome:
      "Request returns 403. No bytes streamed. TicketAccessLog records the denied attempt.",
    requiredFixture:
      "synthetic-ppks-ticket, ppks-attachment, PETUGAS session",
    dependsOn: "lib.authorization",
    testLevel: "integration",
  },

  // =========================================================
  // CSRF
  // =========================================================
  {
    id: "M2-CSRF-001",
    area: "CSRF",
    severity: "high",
    actor: "Attacker (cross-origin)",
    precondition:
      "Victim is logged in as ADMIN. Attacker hosts a malicious page on a different origin.",
    attack:
      "Attacker's page issues a cross-origin POST to FUSPI's login, user-create, or post-publish Server Action without a valid CSRF token.",
    invariant:
      "All state-changing Server Actions must validate Origin/Referer or require a per-session CSRF token. Cookie is SameSite=Lax.",
    expectedOutcome:
      "Cross-origin POST returns 403. No state mutation occurs on the server.",
    requiredFixture:
      "ADMIN session, attacker origin page fixture, Server Action endpoint URLs",
    dependsOn: "auth.csrf",
    testLevel: "e2e",
  },

  // =========================================================
  // Upload — Spoof, Path Traversal, Bombs
  // =========================================================
  {
    id: "M2-UPLOAD-001",
    area: "Upload Path Traversal",
    severity: "critical",
    actor: "EDITOR (malicious)",
    precondition: "EDITOR is logged in and has permission to upload media.",
    attack:
      "Upload a file with filename `../../../etc/passwd` via the multipart upload endpoint.",
    invariant:
      "Storage path must be derived from server-generated random bytes, never from user-supplied filename. Canonical path check must reject escape attempts.",
    expectedOutcome:
      "Upload rejected with 400. No file written outside UPLOAD_DIR. Original filename sanitized and stored as metadata only.",
    requiredFixture: "EDITOR session, crafted multipart payload",
    dependsOn: "lib.upload",
    testLevel: "integration",
  },
  {
    id: "M2-UPLOAD-002",
    area: "Upload MIME Spoof",
    severity: "high",
    actor: "EDITOR (malicious)",
    precondition: "EDITOR is logged in.",
    attack:
      "Upload a PHP webshell renamed to `.jpg` with Content-Type `image/jpeg`.",
    invariant:
      "File type must be validated by magic bytes (file signature), not by extension or declared MIME. Executable code must never be stored in upload directories.",
    expectedOutcome:
      "Upload rejected with 400 before any file is persisted. Sharp fails to decode the file as image.",
    requiredFixture: "EDITOR session, crafted PHP/jpg binary payload",
    dependsOn: "lib.upload",
    testLevel: "integration",
  },
  {
    id: "M2-UPLOAD-003",
    area: "Upload Decompression Bomb",
    severity: "high",
    actor: "EDITOR (malicious)",
    precondition: "EDITOR is logged in.",
    attack:
      "Upload a small file (~50 KB) that Sharp expands to >100 megapixels during decode (pixel bomb).",
    invariant:
      "Sharp pipeline must set a pixel limit that rejects decompression bombs before memory exhaustion.",
    expectedOutcome: "Upload rejected with 400. No temp file persists on disk.",
    requiredFixture: "EDITOR session, crafted pixel-bomb image",
    dependsOn: "lib.upload",
    testLevel: "integration",
  },
  {
    id: "M2-UPLOAD-004",
    area: "Upload Null Byte",
    severity: "medium",
    actor: "EDITOR (malicious)",
    precondition: "EDITOR is logged in.",
    attack:
      "Upload file with null byte in the multipart filename field: `image.jpg\\0.php`.",
    invariant:
      "Null bytes must be rejected in all user-supplied filename fields before any path operation.",
    expectedOutcome: "Upload rejected. Error logged without disclosing disk path.",
    requiredFixture: "EDITOR session, null-byte payload",
    dependsOn: "lib.upload",
    testLevel: "integration",
  },

  // =========================================================
  // Encrypted-Payload Tampering
  // =========================================================
  {
    id: "M2-ENC-001",
    area: "Encryption Tampering",
    severity: "critical",
    actor: "ADMIN (with DB access)",
    precondition:
      "A PPKS ticket has encrypted attachments. ADMIN has direct database access and knows the attachment IDs.",
    attack:
      "Modify the ciphertext field in the database for a PPKS attachment record, then request the file via the authorized SATGAS_PPKS download route.",
    invariant:
      "AES-256-GCM authentication tag must detect any ciphertext modification. Decryption must fail with an integrity error, and the system must not return garbage data.",
    expectedOutcome:
      "Decryption fails. SATGAS_PPKS sees a generic download-error message. No plaintext fragments leaked.",
    requiredFixture:
      "synthetic-ppks-ticket with encrypted attachment, SATGAS_PPKS session, DB manipulation harness",
    dependsOn: "lib.ppks-encryption",
    testLevel: "integration",
  },
  {
    id: "M2-ENC-002",
    area: "Encryption Tampering",
    severity: "critical",
    actor: "Attacker (man-in-the-middle of DB)",
    precondition:
      "PPKS ticket with encrypted body and attachments exists.",
    attack:
      "Modify the authentication tag stored alongside the ciphertext, then attempt decryption via SATGAS_PPKS session.",
    invariant:
      "GCM authentication tag mismatches must be caught. The system must not fall back to unauthenticated decryption.",
    expectedOutcome:
      "Decryption fails with tag mismatch error. No plaintext returned.",
    requiredFixture:
      "synthetic-ppks-ticket, SATGAS_PPKS session, DB tampering harness",
    dependsOn: "lib.ppks-encryption",
    testLevel: "integration",
  },
  {
    id: "M2-ENC-003",
    area: "Encryption Tampering",
    severity: "high",
    actor: "Attacker (post-rotation)",
    precondition:
      "PPKS_ENCRYPTION_KEY has been rotated. Old attachments use keyVersion=1. New attachments use keyVersion=2.",
    attack:
      "Attempt to decrypt a keyVersion=1 attachment using keyVersion=2 or vice versa.",
    invariant:
      "Decryption must select the key by keyVersion. Mismatched key must produce a clean failure, not corrupt output.",
    expectedOutcome:
      "Cross-version decryption fails. Correct-version decryption succeeds for each attachment.",
    requiredFixture:
      "two PPKS attachments with keyVersion=1 and keyVersion=2, both keys in fixture config",
    dependsOn: "lib.ppks-encryption",
    testLevel: "integration",
  },
  {
    id: "M2-ENC-004",
    area: "Encryption Tampering",
    severity: "high",
    actor: "Attacker (replay)",
    precondition:
      "Two PPKS attachments exist with known nonce values. Attacker replays a known nonce.",
    attack:
      "Re-encrypt different plaintext using the same nonce as a prior attachment. Attempt decryption.",
    invariant:
      "Nonce must be randomly generated for each encryption operation. Nonce reuse detection is implementation responsibility.",
    expectedOutcome:
      "Either nonce collision is vanishingly improbable, or explicit nonce-uniqueness check rejects the operation at encryption time.",
    requiredFixture: "two plaintext payloads, encryption helper",
    dependsOn: "lib.ppks-encryption",
    testLevel: "unit",
  },

  // =========================================================
  // PPKS Isolation
  // =========================================================
  {
    id: "M2-PPKS-001",
    area: "PPKS Isolation",
    severity: "critical",
    actor: "ADMIN",
    precondition:
      "3 PPKS tickets in various statuses exist. ADMIN has an active session.",
    attack:
      "ADMIN requests the ticket list CSV export that includes PPKS category.",
    invariant:
      "PPKS tickets in CSV exports must contain only aggregated metadata: count, status. Subject, description, identity, and attachment data must never appear in CSV rows.",
    expectedOutcome:
      "CSV contains row count and aggregate statistics for PPKS. No individual ticket detail leaked.",
    requiredFixture: "3 synthetic-ppks-tickets, ADMIN session, export endpoint",
    dependsOn: "lib.authorization",
    testLevel: "integration",
  },
  {
    id: "M2-PPKS-002",
    area: "PPKS Isolation",
    severity: "critical",
    actor: "SATGAS_PPKS",
    precondition: "PPKS ticket with attachment exists.",
    attack:
      "SATGAS_PPKS views and downloads the PPKS attachment through the authorized route.",
    invariant:
      "Every authorized view/download of PPKS content must create a TicketAccessLog row. Denied access attempts must also be logged.",
    expectedOutcome:
      "Two TicketAccessLog rows created: one for view, one for download. Both record actor, ticket, action, and timestamp.",
    requiredFixture:
      "synthetic-ppks-ticket with attachment, SATGAS_PPKS session",
    dependsOn: "lib.ppks-isolation",
    testLevel: "integration",
  },
  {
    id: "M2-PPKS-003",
    area: "PPKS Isolation",
    severity: "high",
    actor: "PETUGAS",
    precondition: "PPKS ticket exists. PETUGAS session is active.",
    attack:
      "PETUGAS opens the non-PPKS ticket dashboard and searches for the PPKS ticket ID.",
    invariant:
      "All ticket queries must filter out category=PELECEHAN_SEKSUAL for non-SATGAS_PPKS roles. Search must not leak PPKS ticket existence.",
    expectedOutcome:
      "PPKS ticket does not appear in search results for PETUGAS.",
    requiredFixture: "synthetic-ppks-ticket, PETUGAS session",
    dependsOn: "lib.authorization",
    testLevel: "integration",
  },
  {
    id: "M2-PPKS-004",
    area: "PPKS Isolation",
    severity: "medium",
    actor: "SATGAS_PPKS",
    precondition:
      "Multiple PPKS tickets exist. SATGAS_PPKS is logged in.",
    attack:
      "SATGAS_PPKS attempts to delete TicketAccessLog entries from the UI or API.",
    invariant:
      "TicketAccessLog must have no delete action available to any role. Delete operations on this table must be rejected at the authorization layer.",
    expectedOutcome:
      "Delete attempt returns 403. Log rows remain intact. Audit trail preserved.",
    requiredFixture:
      "synthetic-ppks-tickets with access log rows, SATGAS_PPKS session",
    dependsOn: "lib.authorization",
    testLevel: "integration",
  },

  // =========================================================
  // Annual Sequence Concurrency
  // =========================================================
  {
    id: "M2-SEQ-001",
    area: "Concurrency",
    severity: "high",
    actor: "System (concurrent ticket creation)",
    precondition:
      "20 simulated users submit tickets simultaneously to the same year counter.",
    attack:
      "Fire 20 parallel ticket-create Server Actions targeting the same AnnualSequence row.",
    invariant:
      "Every ticket must receive a unique, sequential ticket number within the year. No gaps, no duplicates.",
    expectedOutcome:
      "20 distinct numbers assigned (e.g. 0001–0020). Prisma P2034 retries resolve contention without data loss.",
    requiredFixture:
      "concurrency harness spawning 20 parallel requests, isolated AnnualSequence row",
    dependsOn: "db.annual-sequence",
    testLevel: "integration",
  },
  {
    id: "M2-SEQ-002",
    area: "Concurrency",
    severity: "high",
    actor: "System (year boundary)",
    precondition:
      "AnnualSequence for December 31st exists. Clock advances to January 1st.",
    attack:
      "Create tickets with dates straddling the year boundary. Verify counter resets.",
    invariant:
      "Each calendar year has its own counter starting at 1. Crossing January 1st does not continue or conflict with the prior year's counter.",
    expectedOutcome:
      "First ticket of new year gets 0001. Old year counter is immutable.",
    requiredFixture:
      "isolated AnnualSequence rows for two distinct years, boundary clock fixture",
    dependsOn: "db.annual-sequence",
    testLevel: "integration",
  },
  {
    id: "M2-SEQ-003",
    area: "Concurrency",
    severity: "medium",
    actor: "System (concurrent sequence kinds)",
    precondition:
      "Both TICKET and BOOKING sequence rows exist for the same year.",
    attack:
      "Create 10 tickets and 10 bookings in parallel. Verify that the two counters do not interfere.",
    invariant:
      "Each kind (TICKET, BOOKING) must have an independent counter. Parallel increments on different kinds must not create cross-kind gaps.",
    expectedOutcome:
      "10 distinct ticket numbers and 10 distinct booking numbers, each sequential within their kind, no cross-contamination.",
    requiredFixture:
      "both kind rows in AnnualSequence, 20-parallel-request harness",
    dependsOn: "db.annual-sequence",
    testLevel: "integration",
  },

  // =========================================================
  // Outbox Idempotency
  // =========================================================
  {
    id: "M2-OBX-001",
    area: "Outbox",
    severity: "critical",
    actor: "System (outbox worker)",
    precondition:
      "A NotificationOutbox row with a known idempotencyKey exists and has already been sent.",
    attack:
      "Submit a second outbox row with the same idempotencyKey via a retry or duplicate transaction.",
    invariant:
      "Unique constraint on idempotencyKey must reject the duplicate insert. The worker must handle the unique constraint gracefully as an idempotent no-op.",
    expectedOutcome:
      "Duplicate insert returns Prisma P2002. Original outbox row is unchanged. No duplicate email sent.",
    requiredFixture: "existing NotificationOutbox row, retry harness",
    dependsOn: "lib.outbox",
    testLevel: "integration",
  },
  {
    id: "M2-OBX-002",
    area: "Outbox",
    severity: "critical",
    actor: "System (outbox worker)",
    precondition:
      "A sensitive PPKS notification outbox row exists with an encrypted payload (payloadEncrypted=true).",
    attack:
      "An attacker with DB access modifies the idempotencyKey and re-inserts, hoping the worker processes it again with plaintext exposure.",
    invariant:
      "Sensitive outbox rows must carry encrypted payload only. The idempotencyKey uniqueness + encrypted flag prevents plaintext leakage on retry.",
    expectedOutcome:
      "Duplicate rejected by unique constraint. If forced, encrypted payload cannot be read without decryption key.",
    requiredFixture: "sensitive outbox row with encryptedPayload",
    dependsOn: "lib.outbox",
    testLevel: "integration",
  },
  {
    id: "M2-OBX-003",
    area: "Outbox",
    severity: "high",
    actor: "System (ticket creation)",
    precondition: "No prior outbox rows exist for this ticket.",
    attack:
      "Create a ticket with SMTP temporarily unavailable. Verify that ticket data is committed even though email fails.",
    invariant:
      "Outbox write must be in the same transaction as the ticket creation. SMTP failure must not roll back the ticket data.",
    expectedOutcome:
      "Ticket row committed. NotificationOutbox row exists with status=PENDING. No email sent until SMTP recovers and worker processes the row.",
    requiredFixture: "ticket creation action, SMTP mock/failure harness",
    dependsOn: "lib.outbox",
    testLevel: "integration",
  },

  // =========================================================
  // CSV Injection
  // =========================================================
  {
    id: "M2-CSV-001",
    area: "CSV Injection",
    severity: "high",
    actor: "Attacker (via user input)",
    precondition:
      "An EDITOR creates a Post with title `=HYPERLINK(\"http://evil.example\")`.",
    attack:
      "ADMIN exports Posts CSV. The formula cell executes when the CSV is opened in Excel or Google Sheets.",
    invariant:
      "Any cell value beginning with =, +, -, or @ must be prefixed with a single quote during CSV export to prevent formula execution.",
    expectedOutcome:
      "Exported CSV cell contains `'=HYPERLINK(...)` (with apostrophe prefix). Formula does not execute.",
    requiredFixture:
      "synthetic-post with formula injection in title, CSV export endpoint, ADMIN session",
    dependsOn: "lib.sanitizer",
    testLevel: "unit",
  },
  {
    id: "M2-CSV-002",
    area: "CSV Injection",
    severity: "high",
    actor: "Attacker (via ticket reply)",
    precondition:
      "A ticket reply contains `+SUM(1,2)` as user input. ADMIN exports ticket history CSV.",
    attack:
      "CSV export includes the reply text without escaping the leading + character.",
    invariant:
      "All user-supplied text in CSV export columns must escape formula-injection characters.",
    expectedOutcome:
      "Cell value is `'+SUM(1,2)`. No formula execution. All export columns protected.",
    requiredFixture: "synthetic-ticket with injected reply, CSV export endpoint",
    dependsOn: "lib.sanitizer",
    testLevel: "unit",
  },

  // =========================================================
  // Additional: Email PPKS Privacy
  // =========================================================
  {
    id: "M2-EMAIL-001",
    area: "PPKS Email Privacy",
    severity: "critical",
    actor: "System (SMTP outbox worker)",
    precondition:
      "A new PPKS ticket is created anonymously. The ticket body contains sensitive details.",
    attack:
      "Inspect the NotificationOutbox payload and the actual SMTP email body that would be sent.",
    invariant:
      "Email bodies for PPKS tickets must contain only a generic message: 'Ada laporan baru, silakan login'. Subject, description, identity, and attachment references must never appear in email.",
    expectedOutcome:
      "Outbox payload contains only resourceId and generic notification type. Email body has no PPKS content. SMTP headers contain no identifying data beyond the generic subject.",
    requiredFixture: "synthetic-ppks-ticket, outbox worker with SMTP mock",
    dependsOn: "lib.outbox",
    testLevel: "integration",
  },

  // =========================================================
  // Additional: Upload Transaction Atomicity
  // =========================================================
  {
    id: "M2-UPLOAD-005",
    area: "Upload Atomicity",
    severity: "high",
    actor: "System (upload endpoint)",
    precondition:
      "EDITOR uploads a valid image. The file is written to temp, but the database insert fails (e.g., serialization error).",
    attack:
      "Simulate a database error after the file is written to disk but before the Media record is created.",
    invariant:
      "File write and database insert must be reversed atomically. No orphaned files on disk after failed upload.",
    expectedOutcome:
      "Temp file is deleted. No Media record exists. Disk state matches database state.",
    requiredFixture: "EDITOR session, DB error injection harness",
    dependsOn: "lib.upload",
    testLevel: "integration",
  },

  // =========================================================
  // Low Severity — Edge cases & hardening depth
  // =========================================================
  {
    id: "M2-UPLOAD-006",
    area: "Upload Null Byte",
    severity: "low",
    actor: "EDITOR (benign)",
    precondition: "EDITOR uploads a file with a valid filename containing special but safe Unicode characters.",
    attack:
      "Upload `résumé-2026.webp`. Verify that the storage path is derived from random bytes and the Unicode original name is stored safely as metadata.",
    invariant:
      "Unicode filenames must not break path resolution. Storage key is always ASCII random bytes.",
    expectedOutcome:
      "Upload succeeds. originalName in DB preserves the Unicode string. Storage key is ASCII-safe.",
    requiredFixture: "EDITOR session, Unicode-named image payload",
    dependsOn: "lib.upload",
    testLevel: "integration",
  },
  {
    id: "M2-CSV-003",
    area: "CSV Injection",
    severity: "low",
    actor: "System (CSV export)",
    precondition:
      "Tickets with benign content exist. No injection characters present.",
    attack:
      "Export CSV and verify that normal content is not altered by the injection-escape routine.",
    invariant:
      "CSV sanitization must not modify cells that do not start with formula-injection characters.",
    expectedOutcome:
      "Normal text appears verbatim. Only cells starting with =, +, -, @ receive the apostrophe prefix.",
    requiredFixture: "multiple synthetic tickets with varied text content",
    dependsOn: "lib.sanitizer",
    testLevel: "unit",
  },
];

export function getM2Plan(): M2SecurityTestCase[] {
  return plan;
}

export function getM2ByArea(area: string): M2SecurityTestCase[] {
  return plan.filter((c) => c.area === area);
}

export function getM2BySeverity(severity: M2SecurityTestCase["severity"]): M2SecurityTestCase[] {
  return plan.filter((c) => c.severity === severity);
}

export function getM2ByTestLevel(level: TestLevel): M2SecurityTestCase[] {
  return plan.filter((c) => c.testLevel === level);
}

export function getM2ByDependsOn(dependency: string): M2SecurityTestCase[] {
  return plan.filter((c) => c.dependsOn === dependency);
}

export function countM2BySeverity(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of plan) {
    counts[c.severity] = (counts[c.severity] ?? 0) + 1;
  }
  return counts;
}

export function getM2Dependencies(): string[] {
  return [...new Set(plan.map((c) => c.dependsOn))].sort();
}

export interface ThreatTestCase {
  id: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  testVectors: string[];
  requiresDb: boolean;
  status: "pending_migration" | "ready";
}

const threatMatrix: ThreatTestCase[] = [
  {
    id: "AUTH-001",
    category: "Authentication",
    severity: "critical",
    description: "Missing session — unauthenticated access to admin routes returns 401/redirect",
    testVectors: [
      "GET /admin without session cookie",
      "POST admin Server Action without session",
      "Direct access to admin API routes without auth",
    ],
    requiresDb: true,
    status: "pending_migration",
  },
  {
    id: "AUTH-002",
    category: "Authentication",
    severity: "high",
    description: "Expired session rejected — session older than 8 hours is invalid",
    testVectors: [
      "Request with session.expires < now()",
      "Request with deleted session record",
    ],
    requiresDb: true,
    status: "pending_migration",
  },
  {
    id: "AUTH-003",
    category: "Authentication",
    severity: "high",
    description: "Inactive user cannot authenticate",
    testVectors: [
      "Login attempt with isActive=false user",
      "Active session from deactivated user revoked",
    ],
    requiresDb: true,
    status: "pending_migration",
  },
  {
    id: "AUTH-004",
    category: "Authentication",
    severity: "medium",
    description: "Password change revokes all existing sessions",
    testVectors: [
      "After password change, old sessionToken is invalid",
    ],
    requiresDb: true,
    status: "pending_migration",
  },
  {
    id: "AUTH-005",
    category: "Authentication",
    severity: "medium",
    description: "Role change revokes existing sessions",
    testVectors: [
      "After role demotion, old session cannot access previous paths",
    ],
    requiresDb: true,
    status: "pending_migration",
  },
  {
    id: "AUTH-006",
    category: "Authentication",
    severity: "low",
    description: "Brute-force rate limiting on login endpoint",
    testVectors: [
      "5 rapid failed logins from same IP within 60s",
    ],
    requiresDb: true,
    status: "pending_migration",
  },

  {
    id: "IDOR-001",
    category: "Authorization / IDOR",
    severity: "critical",
    description: "EDITOR cannot modify another editor's post",
    testVectors: [
      "EDITOR-A calls updatePost() on EDITOR-B's postId",
      "EDITOR-A calls deletePost() on EDITOR-B's postId",
    ],
    requiresDb: true,
    status: "pending_migration",
  },
  {
    id: "IDOR-002",
    category: "Authorization / IDOR",
    severity: "critical",
    description: "PETUGAS cannot access PPKS ticket content",
    testVectors: [
      "PETUGAS requests PPKS ticket detail",
      "PETUGAS downloads PPKS attachment",
    ],
    requiresDb: true,
    status: "pending_migration",
  },
  {
    id: "IDOR-003",
    category: "Authorization / IDOR",
    severity: "critical",
    description: "SATGAS_PPKS is the only role that can decrypt PPKS content",
    testVectors: [
      "ADMIN requests PPKS decryption — denied",
      "SATGAS_PPKS requests PPKS decryption — allowed",
    ],
    requiresDb: true,
    status: "pending_migration",
  },
  {
    id: "IDOR-004",
    category: "Authorization / IDOR",
    severity: "high",
    description: "ADMIN cannot access PPKS ticket content (privacy firewall)",
    testVectors: [
      "ADMIN queries PPKS complaints — ciphertext only, no plaintext",
    ],
    requiresDb: true,
    status: "pending_migration",
  },
  {
    id: "IDOR-005",
    category: "Authorization / IDOR",
    severity: "high",
    description: "User cannot escalate their own role via API",
    testVectors: [
      "EDITOR calls updateUser() to set role=ADMIN on themselves",
    ],
    requiresDb: true,
    status: "pending_migration",
  },

  {
    id: "PPKS-001",
    category: "PPKS Privacy",
    severity: "critical",
    description: "PPKS complaint body and attachments are stored encrypted",
    testVectors: [
      "Direct DB query shows ciphertext for PPKS ticket content",
      "PPKS attachments not accessible via direct URL",
    ],
    requiresDb: true,
    status: "pending_migration",
  },
  {
    id: "PPKS-002",
    category: "PPKS Privacy",
    severity: "critical",
    description: "TicketAccessLog records every access to PPKS tickets",
    testVectors: [
      "SATGAS_PPKS opens PPKS ticket → log entry created",
      "Unauthorized view attempt → log entry with blocked status",
    ],
    requiresDb: true,
    status: "pending_migration",
  },
  {
    id: "PPKS-003",
    category: "PPKS Privacy",
    severity: "medium",
    description: "Reporter tracking token is stored only as hash",
    testVectors: [
      "Verify DB stores hash(dodol_token), not plain dodol_token",
    ],
    requiresDb: true,
    status: "pending_migration",
  },

  {
    id: "UPLOAD-001",
    category: "Upload Hardening",
    severity: "high",
    description: "Path traversal blocked in upload filenames",
    testVectors: [
      "Upload file named '../../../etc/passwd'",
      "Upload file with '../' in storageKey",
    ],
    requiresDb: true,
    status: "pending_migration",
  },
  {
    id: "UPLOAD-002",
    category: "Upload Hardening",
    severity: "medium",
    description: "MIME type spoofing detected",
    testVectors: [
      "Upload .php file with image/jpeg MIME type",
      "Upload .exe renamed to .jpg",
    ],
    requiresDb: true,
    status: "pending_migration",
  },
  {
    id: "UPLOAD-003",
    category: "Upload Hardening",
    severity: "medium",
    description: "File size limit enforced",
    testVectors: [
      "Upload file larger than UPLOAD_MAX_SIZE",
    ],
    requiresDb: true,
    status: "pending_migration",
  },

  {
    id: "XSS-001",
    category: "XSS / Content Injection",
    severity: "high",
    description: "Rich text content sanitized before render",
    testVectors: [
      "<script>alert(1)</script> in post content",
      "javascript: URL in link",
      "<img onerror=...> in Tiptap content",
    ],
    requiresDb: true,
    status: "pending_migration",
  },
  {
    id: "XSS-002",
    category: "XSS / Content Injection",
    severity: "medium",
    description: "CSV injection prevented in exports",
    testVectors: [
      "Cell starting with =, +, -, @ in CSV export",
    ],
    requiresDb: true,
    status: "pending_migration",
  },

  {
    id: "LOCALE-001",
    category: "Locale / RTL",
    severity: "low",
    description: "Missing locale defaults to Indonesian (id)",
    testVectors: [
      "Request to / without locale prefix → redirect /id",
      "Request to /ru/about → redirect /id/about",
    ],
    requiresDb: false,
    status: "ready",
  },
  {
    id: "LOCALE-002",
    category: "Locale / RTL",
    severity: "low",
    description: "Arabic pages consistently render RTL",
    testVectors: [
      "html[dir='rtl'] on /ar/*",
      "html[lang='ar'] on /ar/*",
    ],
    requiresDb: false,
    status: "ready",
  },
  {
    id: "LOCALE-003",
    category: "Locale / RTL",
    severity: "low",
    description: "ID/EN pages consistently render LTR",
    testVectors: [
      "html[dir='ltr'] on /id/* and /en/*",
    ],
    requiresDb: false,
    status: "ready",
  },
  {
    id: "LOCALE-004",
    category: "Locale / RTL",
    severity: "low",
    description: "RTL direction persists across page navigation",
    testVectors: [
      "Navigate /ar/page-a → /ar/page-b, dir stays rtl",
    ],
    requiresDb: false,
    status: "ready",
  },
  {
    id: "LOCALE-005",
    category: "Locale / RTL",
    severity: "low",
    description: "FUDA identity never appears in any locale",
    testVectors: [
      "Page source /id → no 'FUDA'",
      "Page source /en → no 'FUDA'",
      "Page source /ar → no 'FUDA'",
    ],
    requiresDb: false,
    status: "ready",
  },

  {
    id: "CSRF-001",
    category: "CSRF",
    severity: "high",
    description: "State-changing Server Actions require valid session",
    testVectors: [
      "POST to admin action without session cookie",
      "Cross-origin POST to admin action",
    ],
    requiresDb: true,
    status: "pending_migration",
  },

  {
    id: "SQLI-001",
    category: "SQL Injection",
    severity: "high",
    description: "User input vectors use parameterized queries via Prisma",
    testVectors: [
      "Search with SQL injection payload in query string",
      "Slug parameter with UNION SELECT",
    ],
    requiresDb: true,
    status: "pending_migration",
  },

  {
    id: "RATE-001",
    category: "Rate Limiting",
    severity: "high",
    description: "Form submission rate limited per IP",
    testVectors: [
      "10 consecutive form submissions from same IP within 60s",
    ],
    requiresDb: true,
    status: "pending_migration",
  },
];

export function getThreatMatrix(): ThreatTestCase[] {
  return threatMatrix;
}

export function getThreatTestsByCategory(category: string): ThreatTestCase[] {
  return threatMatrix.filter((t) => t.category === category);
}

export function getThreatTestsBySeverity(severity: ThreatTestCase["severity"]): ThreatTestCase[] {
  return threatMatrix.filter((t) => t.severity === severity);
}

export function getReadyTests(): ThreatTestCase[] {
  return threatMatrix.filter((t) => t.status === "ready");
}

export function getPendingTests(): ThreatTestCase[] {
  return threatMatrix.filter((t) => t.status === "pending_migration");
}

export function countByCategory(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of threatMatrix) {
    counts[t.category] = (counts[t.category] ?? 0) + 1;
  }
  return counts;
}

export function countBySeverity(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of threatMatrix) {
    counts[t.severity] = (counts[t.severity] ?? 0) + 1;
  }
  return counts;
}

import {describe, expect, it} from "vitest";

import {
  getM2Plan,
  getM2ByArea,
  getM2BySeverity,
  getM2ByTestLevel,
  getM2ByDependsOn,
  countM2BySeverity,
  getM2Dependencies,
  VALID_DEPENDENCIES,
  validateM2Readiness,
} from "./m2-threat-plan";
import type {M2SecurityTestCase} from "./m2-threat-plan";

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gu;
const ALLOWED_TEST_EMAIL_DOMAINS = new Set(["example.invalid"]);
const REAL_PHONE_PATTERN = /(?<!\d)(?:\+?62|0)(?:[\s.-]?\d){9,13}(?!\d)/u;
const SECRET_MATERIAL_PATTERN =
  /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_-]?key|secret|token)\s*[:=]\s*["']?[a-zA-Z0-9_./+=-]{16,})/iu;
const FUDA_DOMAIN_PATTERN =
  /fuda\.uinbanten\.ac\.id/;
const FUSPI_DOMAIN_PATTERN =
  /fuspi\.uinbanten\.ac\.id/;

describe("M2 security test plan meta-validation", () => {
  const plan = getM2Plan();

  it("has at least 30 test cases covering all required areas", () => {
    expect(plan.length).toBeGreaterThanOrEqual(30);
  });

  it("has no duplicate IDs", () => {
    const ids = plan.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every case has all required fields filled", () => {
    const requiredKeys: (keyof M2SecurityTestCase)[] = [
      "id",
      "area",
      "severity",
      "actor",
      "precondition",
      "attack",
      "invariant",
      "expectedOutcome",
      "requiredFixture",
      "dependsOn",
      "testLevel",
      "executable",
    ];
    for (const c of plan) {
      for (const key of requiredKeys) {
        expect(c[key], `${c.id} is missing field "${key}"`).toBeDefined();
        if (key === "executable") {
          expect(
            typeof c[key],
            `${c.id} executable must be boolean`,
          ).toBe("boolean");
        } else {
          expect(c[key], `${c.id} has empty field "${key}"`).not.toBe("");
        }
      }
    }
  });

  it("IDs follow the M2-{AREA}-{NNN} convention", () => {
    for (const c of plan) {
      expect(c.id).toMatch(/^M2-[A-Z]+-\d{3}$/);
    }
  });

  it("all severities are recognized", () => {
    const allowed = new Set(["critical", "high", "medium", "low"]);
    for (const c of plan) {
      expect(allowed.has(c.severity), `${c.id} has invalid severity`).toBe(true);
    }
  });

  it("all test levels are recognized", () => {
    const allowed = new Set(["unit", "integration", "e2e"]);
    for (const c of plan) {
      expect(allowed.has(c.testLevel), `${c.id} has invalid testLevel`).toBe(true);
    }
  });

  it("every Critical case has a non-empty invariant", () => {
    const critical = plan.filter((c) => c.severity === "critical");
    expect(critical.length).toBeGreaterThan(0);
    for (const c of critical) {
      expect(c.invariant.length, `${c.id} critical case missing invariant`).toBeGreaterThan(
        10,
      );
    }
  });

  it("every High case has a non-empty invariant", () => {
    const high = plan.filter((c) => c.severity === "high");
    expect(high.length).toBeGreaterThan(0);
    for (const c of high) {
      expect(c.invariant.length, `${c.id} high case missing invariant`).toBeGreaterThan(
        5,
      );
    }
  });

  it("no case contains production PII or secret material", () => {
    for (const c of plan) {
      const full = JSON.stringify(c);
      const emails = full.match(EMAIL_PATTERN) ?? [];
      for (const email of emails) {
        const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
        expect(
          ALLOWED_TEST_EMAIL_DOMAINS.has(domain),
          `${c.id} contains non-reserved email domain in "${email}"`,
        ).toBe(true);
      }
      expect(REAL_PHONE_PATTERN.test(full), `${c.id} contains real-looking phone data`).toBe(
        false,
      );
      expect(
        SECRET_MATERIAL_PATTERN.test(full),
        `${c.id} contains secret-like material`,
      ).toBe(false);
    }
  });

  it("no case references FUDA domain", () => {
    for (const c of plan) {
      const full = JSON.stringify(c);
      expect(
        FUDA_DOMAIN_PATTERN.test(full),
        `${c.id} references forbidden FUDA domain`,
      ).toBe(false);
    }
  });

  it("no case references FUSPI production domain", () => {
    for (const c of plan) {
      const full = JSON.stringify(c);
      expect(
        FUSPI_DOMAIN_PATTERN.test(full),
        `${c.id} references forbidden FUSPI production domain`,
      ).toBe(false);
    }
  });

  it("every dependsOn references a known contract/component ID", () => {
    for (const c of plan) {
      expect(
        VALID_DEPENDENCIES.has(c.dependsOn),
        `${c.id} references unknown dependency "${c.dependsOn}"`,
      ).toBe(true);
    }
  });

  it("all required areas are covered at least once", () => {
    const requiredAreas = [
      "Session Revocation",
      "Inactive User",
      "Login Enumeration",
      "Ownership IDOR",
      "Role Escalation",
      "PPKS IDOR",
      "CSRF",
      "Upload Path Traversal",
      "Upload MIME Spoof",
      "Upload Decompression Bomb",
      "Upload Null Byte",
      "Encryption Tampering",
      "PPKS Isolation",
      "PPKS Email Privacy",
      "Concurrency",
      "Outbox",
      "CSV Injection",
      "Upload Atomicity",
    ];
    const covered = new Set(plan.map((c) => c.area));
    for (const area of requiredAreas) {
      expect(covered.has(area), `Missing required area: ${area}`).toBe(true);
    }
  });

  it("Severity distribution is balanced (at least 2 per level)", () => {
    const counts = countM2BySeverity();
    for (const severity of ["critical", "high", "medium", "low"]) {
      expect(
        counts[severity] ?? 0,
        `No ${severity} severity cases`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("Test level distribution covers all three levels", () => {
    const covered = new Set(plan.map((c) => c.testLevel));
    expect(covered.has("unit")).toBe(true);
    expect(covered.has("integration")).toBe(true);
    expect(covered.has("e2e")).toBe(true);
  });

  it("every dependency ID referenced in the plan is declared in VALID_DEPENDENCIES", () => {
    const deps = getM2Dependencies();
    for (const dep of deps) {
      expect(VALID_DEPENDENCIES.has(dep), `Unknown dependency: ${dep}`).toBe(true);
    }
  });

  it("getM2ByArea returns correct subsets", () => {
    const sessions = getM2ByArea("Session Revocation");
    expect(sessions.length).toBeGreaterThanOrEqual(4);
    for (const c of sessions) {
      expect(c.area).toBe("Session Revocation");
    }
    expect(getM2ByArea("NonExistentArea")).toHaveLength(0);
  });

  it("getM2BySeverity returns correct subsets", () => {
    const critical = getM2BySeverity("critical");
    expect(critical.length).toBeGreaterThanOrEqual(8);
    for (const c of critical) {
      expect(c.severity).toBe("critical");
    }
  });

  it("getM2ByTestLevel returns correct subsets", () => {
    const unit = getM2ByTestLevel("unit");
    expect(unit.length).toBeGreaterThanOrEqual(2);
    expect(getM2ByTestLevel("integration").length).toBeGreaterThanOrEqual(15);
  });

  it("getM2ByDependsOn filters correctly", () => {
    const auth = getM2ByDependsOn("lib.authorization");
    expect(auth.length).toBeGreaterThanOrEqual(4);
    for (const c of auth) {
      expect(c.dependsOn).toBe("lib.authorization");
    }
    expect(getM2ByDependsOn("nonexistent")).toHaveLength(0);
  });

  it("getM2Dependencies returns all unique dependency keys sorted", () => {
    const deps = getM2Dependencies();
    expect(deps.length).toBe(VALID_DEPENDENCIES.size);
    const sorted = [...deps].sort();
    expect(deps).toEqual(sorted);
  });

  it("all test cases are currently blocked (executable: false)", () => {
    const ready = plan.filter((c) => c.executable);
    expect(ready, `Cases marked executable before dependencies merged: ${ready.map((c) => c.id).join(", ")}`).toHaveLength(0);
  });

  it("validateM2Readiness rejects case marked ready when dependency is missing", () => {
    const synthetic: M2SecurityTestCase = {
      id: "M2-SYNTHETIC-001",
      area: "Login Enumeration",
      severity: "high",
      actor: "Attacker",
      precondition: "x",
      attack: "x",
      invariant: "x",
      expectedOutcome: "x",
      requiredFixture: "x",
      dependsOn: "auth.rate-limit",
      testLevel: "integration",
      executable: true,
    };
    const result = validateM2Readiness(synthetic, new Set());
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("auth.rate-limit");
  });

  it("validateM2Readiness accepts blocked case regardless of dependencies", () => {
    const blocked: M2SecurityTestCase = {
      id: "M2-SYNTHETIC-002",
      area: "Login Enumeration",
      severity: "high",
      actor: "Attacker",
      precondition: "x",
      attack: "x",
      invariant: "x",
      expectedOutcome: "x",
      requiredFixture: "x",
      dependsOn: "auth.rate-limit",
      testLevel: "integration",
      executable: false,
    };
    const result = validateM2Readiness(blocked, new Set());
    expect(result.valid).toBe(true);
  });

  it("validateM2Readiness rejects unknown dependency regardless of readiness", () => {
    const unknown: M2SecurityTestCase = {
      id: "M2-SYNTHETIC-003",
      area: "Login Enumeration",
      severity: "high",
      actor: "Attacker",
      precondition: "x",
      attack: "x",
      invariant: "x",
      expectedOutcome: "x",
      requiredFixture: "x",
      dependsOn: "nonexistent.fake",
      testLevel: "integration",
      executable: false,
    };
    const result = validateM2Readiness(unknown, new Set());
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("nonexistent.fake");
  });

  it("validateM2Readiness approves ready case when dependency is available", () => {
    const ready: M2SecurityTestCase = {
      id: "M2-SYNTHETIC-004",
      area: "Login Enumeration",
      severity: "high",
      actor: "Attacker",
      precondition: "x",
      attack: "x",
      invariant: "x",
      expectedOutcome: "x",
      requiredFixture: "x",
      dependsOn: "auth.rate-limit",
      testLevel: "integration",
      executable: true,
    };
    const result = validateM2Readiness(ready, new Set(["auth.rate-limit"]));
    expect(result.valid).toBe(true);
  });
});

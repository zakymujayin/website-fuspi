import { describe, expect, it } from "vitest";
import {
  getThreatMatrix,
  getThreatTestsByCategory,
  getThreatTestsBySeverity,
  getReadyTests,
  getPendingTests,
  countByCategory,
  countBySeverity,
} from "@/../tests/foundation/threat-matrix";

describe("threat matrix", () => {
  const matrix = getThreatMatrix();

  it("has at least 10 test cases", () => {
    expect(matrix.length).toBeGreaterThanOrEqual(10);
  });

  it("every test case has required fields", () => {
    for (const tc of matrix) {
      expect(tc.id).toBeTruthy();
      expect(tc.category).toBeTruthy();
      expect(tc.severity).toBeTruthy();
      expect(tc.description).toBeTruthy();
      expect(Array.isArray(tc.testVectors)).toBe(true);
      expect(tc.testVectors.length).toBeGreaterThanOrEqual(1);
      expect(typeof tc.requiresDb).toBe("boolean");
      expect(["pending_migration", "ready"]).toContain(tc.status);
    }
  });

  it("every test case ID follows THREAT-XXX pattern", () => {
    for (const tc of matrix) {
      expect(tc.id).toMatch(/^[A-Z]+-\d{3}$/);
    }
  });

  it("has no duplicate IDs", () => {
    const ids = matrix.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has ready tests (non-DB dependent)", () => {
    const ready = getReadyTests();
    expect(ready.length).toBeGreaterThan(0);
    for (const tc of ready) {
      expect(tc.requiresDb).toBe(false);
      expect(tc.status).toBe("ready");
    }
  });

  it("has pending tests (require DB migration)", () => {
    const pending = getPendingTests();
    expect(pending.length).toBeGreaterThan(0);
    for (const tc of pending) {
      expect(tc.requiresDb).toBe(true);
      expect(tc.status).toBe("pending_migration");
    }
  });

  it("filters by category", () => {
    const authTests = getThreatTestsByCategory("Authentication");
    expect(authTests.length).toBeGreaterThan(0);
    for (const tc of authTests) {
      expect(tc.category).toBe("Authentication");
    }
  });

  it("filters by severity", () => {
    const criticalTests = getThreatTestsBySeverity("critical");
    expect(criticalTests.length).toBeGreaterThan(0);
    for (const tc of criticalTests) {
      expect(tc.severity).toBe("critical");
    }
  });

  it("searches non-existent category returns empty", () => {
    expect(getThreatTestsByCategory("NonExistent")).toHaveLength(0);
  });

  it("category counts are non-zero", () => {
    const counts = countByCategory();
    for (const count of Object.values(counts)) {
      expect(count).toBeGreaterThan(0);
    }
  });

  it("severity counts cover all levels used", () => {
    const counts = countBySeverity();
    expect(Object.keys(counts).length).toBeGreaterThan(1);
  });

  it("covers required security categories", () => {
    const categories = matrix.map((t) => t.category);
    expect(new Set(categories)).toContain("Authentication");
    expect(new Set(categories)).toContain("Authorization / IDOR");
    expect(new Set(categories)).toContain("PPKS Privacy");
    expect(new Set(categories)).toContain("Upload Hardening");
    expect(new Set(categories)).toContain("XSS / Content Injection");
    expect(new Set(categories)).toContain("Locale / RTL");
  });
});

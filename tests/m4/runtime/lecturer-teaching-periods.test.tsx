import {describe, expect, it, vi} from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({href, children, ...rest}: React.ComponentProps<"a">) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

const {teachingPeriods} = await import("@/components/public/lecturer-academic-records");

const labels = {termOdd: "Ganjil", termEven: "Genap"};

describe("teachingPeriods", () => {
  it("labels a period by term and academic year, newest first", () => {
    const periods = teachingPeriods([
      {id: "a", code: "IAT101", course: "A", program: "IAT", credits: 3, academicYearStart: 2025, academicYearEnd: 2026, term: "even", semester: 2},
      {id: "b", code: "IAT201", course: "B", program: "IAT", credits: 3, academicYearStart: 2026, academicYearEnd: 2027, term: "odd", semester: 3},
    ], labels);

    expect(periods).toEqual([
      {key: "2026-odd", label: "Ganjil 2026/2027"},
      {key: "2025-even", label: "Genap 2025/2026"},
    ]);
  });

  it("collapses duplicate periods to one option", () => {
    const periods = teachingPeriods([
      {id: "a", code: "IAT101", course: "A", program: "IAT", credits: 3, academicYearStart: 2026, academicYearEnd: 2027, term: "odd", semester: 1},
      {id: "b", code: "IAT201", course: "B", program: "IAT", credits: 3, academicYearStart: 2026, academicYearEnd: 2027, term: "odd", semester: 3},
    ], labels);

    expect(periods).toEqual([{key: "2026-odd", label: "Ganjil 2026/2027"}]);
  });

  it("distinguishes the same semester number across different academic years", () => {
    const periods = teachingPeriods([
      {id: "a", code: "IAT101", course: "A", program: "IAT", credits: 3, academicYearStart: 2025, academicYearEnd: 2026, term: "odd", semester: 3},
      {id: "b", code: "IAT201", course: "B", program: "IAT", credits: 3, academicYearStart: 2026, academicYearEnd: 2027, term: "odd", semester: 3},
    ], labels);

    expect(periods).toHaveLength(2);
  });

  it("returns no options when there is no teaching", () => {
    expect(teachingPeriods([], labels)).toEqual([]);
  });
});

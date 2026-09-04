import {fireEvent, render, screen, within} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {EducationManager} from "@/components/admin/lecturer/education-manager";
import {PublicationManager} from "@/components/admin/lecturer/publication-manager";
import {HkiManager} from "@/components/admin/lecturer/hki-manager";
import {TeachingManager} from "@/components/admin/lecturer/teaching-manager";

const educations = [
  {id: "e1", degree: "S1", field: "Tafsir", institution: "UIN Banten", city: "Serang", year: 2010, order: 0},
  {id: "e2", degree: "S2", field: "Hadis", institution: "UIN Jakarta", city: "Jakarta", year: 2015, order: 1},
];

const publications = [
  {id: "p1", title: "Teori Interpretasi Paul Ricoeur", type: "JURNAL", year: 2015, publisher: "Jurnal A", url: null, doi: null, order: 0},
  {id: "p2", title: "The Yahukimo Conflict", type: "BUKU", year: 2021, publisher: "Penerbit B", url: null, doi: null, order: 1},
];

const hkiRecords = [
  {id: "h1", title: "Metode Tafsir Digital", type: "HAK_CIPTA", registrationNumber: "REG-001", year: 2018, url: null, order: 0},
  {id: "h2", title: "Aplikasi Kajian Hadis", type: "PATEN", registrationNumber: "REG-002", year: 2020, url: null, order: 1},
];

const teachingRecords = [
  {id: "t1", courseCode: "IAT101", courseName: "Ulumul Quran", programCode: "IAT", credits: 3, academicYearStart: 2022, academicYearEnd: 2023, term: "GANJIL", semester: 1, order: 0},
  {id: "t2", courseCode: "IH201", courseName: "Ilmu Hadis Lanjut", programCode: "IH", credits: 2, academicYearStart: 2023, academicYearEnd: 2024, term: "GENAP", semester: 3, order: 1},
];

describe("EducationManager", () => {
  it("renders rows in a table", () => {
    render(<EducationManager locale="id" lecturerId="lec1" educations={educations} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("S1")).toBeTruthy();
    expect(within(table).getByText("S2")).toBeTruthy();
  });

  it("shows the empty state when there are no rows", () => {
    render(<EducationManager locale="id" lecturerId="lec1" educations={[]} />);
    expect(screen.getByText("Belum ada riwayat pendidikan.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("remounts the form when switching from one row to another", () => {
    render(<EducationManager locale="id" lecturerId="lec1" educations={educations} />);
    const table = screen.getByRole("table");
    const editButtons = within(table).getAllByRole("button", {name: "Sunting"});

    fireEvent.click(editButtons[0]);
    expect((screen.getByLabelText("Gelar") as HTMLInputElement).value).toBe("S1");

    fireEvent.click(editButtons[1]);
    expect((screen.getByLabelText("Gelar") as HTMLInputElement).value).toBe("S2");
  });
});

describe("PublicationManager", () => {
  it("renders rows in a table", () => {
    render(<PublicationManager locale="id" lecturerId="lec1" publications={publications} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Teori Interpretasi Paul Ricoeur")).toBeTruthy();
    expect(within(table).getByText("The Yahukimo Conflict")).toBeTruthy();
  });

  it("shows the empty state when there are no rows", () => {
    render(<PublicationManager locale="id" lecturerId="lec1" publications={[]} />);
    expect(screen.getByText("Belum ada publikasi.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("remounts the form when switching from one row to another", () => {
    render(<PublicationManager locale="id" lecturerId="lec1" publications={publications} />);
    const table = screen.getByRole("table");
    const editButtons = within(table).getAllByRole("button", {name: "Sunting"});

    fireEvent.click(editButtons[0]);
    expect((screen.getByLabelText("Judul publikasi") as HTMLInputElement).value).toBe("Teori Interpretasi Paul Ricoeur");

    fireEvent.click(editButtons[1]);
    expect((screen.getByLabelText("Judul publikasi") as HTMLInputElement).value).toBe("The Yahukimo Conflict");
  });
});

describe("HkiManager", () => {
  it("renders rows in a table", () => {
    render(<HkiManager locale="id" lecturerId="lec1" hki={hkiRecords} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Metode Tafsir Digital")).toBeTruthy();
    expect(within(table).getByText("Aplikasi Kajian Hadis")).toBeTruthy();
  });

  it("shows the empty state when there are no rows", () => {
    render(<HkiManager locale="id" lecturerId="lec1" hki={[]} />);
    expect(screen.getByText("Belum ada data HKI.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("remounts the form when switching from one row to another", () => {
    render(<HkiManager locale="id" lecturerId="lec1" hki={hkiRecords} />);
    const table = screen.getByRole("table");
    const editButtons = within(table).getAllByRole("button", {name: "Sunting"});

    fireEvent.click(editButtons[0]);
    expect((screen.getByLabelText("Judul karya") as HTMLInputElement).value).toBe("Metode Tafsir Digital");

    fireEvent.click(editButtons[1]);
    expect((screen.getByLabelText("Judul karya") as HTMLInputElement).value).toBe("Aplikasi Kajian Hadis");
  });
});

describe("TeachingManager", () => {
  it("renders rows in a table", () => {
    render(<TeachingManager locale="id" lecturerId="lec1" teaching={teachingRecords} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Ulumul Quran")).toBeTruthy();
    expect(within(table).getByText("Ilmu Hadis Lanjut")).toBeTruthy();
  });

  it("shows the empty state when there are no rows", () => {
    render(<TeachingManager locale="id" lecturerId="lec1" teaching={[]} />);
    expect(screen.getByText("Belum ada mata kuliah yang diampu.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("remounts the form when switching from one row to another", () => {
    render(<TeachingManager locale="id" lecturerId="lec1" teaching={teachingRecords} />);
    const table = screen.getByRole("table");
    const editButtons = within(table).getAllByRole("button", {name: "Sunting"});

    fireEvent.click(editButtons[0]);
    expect((screen.getByLabelText("Nama mata kuliah") as HTMLInputElement).value).toBe("Ulumul Quran");

    fireEvent.click(editButtons[1]);
    expect((screen.getByLabelText("Nama mata kuliah") as HTMLInputElement).value).toBe("Ilmu Hadis Lanjut");
  });
});

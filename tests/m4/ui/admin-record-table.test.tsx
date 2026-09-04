import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecordTable } from "@/components/admin/shared/record-table";

type Row = { id: string; title: string; year: number };

const columns = [
  { key: "title", label: "Judul", render: (row: Row) => row.title },
  { key: "year", label: "Tahun", render: (row: Row) => String(row.year) },
];

function renderTable(rows: readonly Row[], onAdd = vi.fn()) {
  return render(
    <RecordTable
      title="Publikasi"
      addLabel="Tambah publikasi"
      onAdd={onAdd}
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      emptyLabel="Belum ada publikasi."
      renderActions={(row) => <button type="button">Sunting {row.title}</button>}
      renderCard={(row) => <span>{row.title}</span>}
    />,
  );
}

describe("RecordTable", () => {
  it("shows the empty label and no table when there are no rows", () => {
    renderTable([]);
    expect(screen.getByText("Belum ada publikasi.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("renders one row per record with its columns", () => {
    renderTable([
      { id: "a", title: "Teori Interpretasi Paul Ricoeur", year: 2015 },
      { id: "b", title: "The Yahukimo Conflict", year: 2021 },
    ]);

    const table = screen.getByRole("table");
    expect(table).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    // The md:hidden card list and the md:block table both render in jsdom (no real CSS is
    // loaded in this test environment to hide either), so titles duplicate across them —
    // scope this assertion to the table to check the desktop row content specifically.
    expect(within(table).getByText("Teori Interpretasi Paul Ricoeur")).toBeTruthy();
    expect(within(table).getByText("2021")).toBeTruthy();
  });

  it("shows the record count in the header", () => {
    renderTable([
      { id: "a", title: "A", year: 2015 },
      { id: "b", title: "B", year: 2021 },
    ]);
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("calls onAdd when the add button is pressed", async () => {
    const onAdd = vi.fn();
    renderTable([], onAdd);
    fireEvent.click(screen.getByRole("button", { name: "Tambah publikasi" }));
    expect(onAdd).toHaveBeenCalledOnce();
  });
});

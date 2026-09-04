"use client";

import {PencilLineIcon} from "lucide-react";
import {useActionState, useEffect, useState} from "react";

import {LecturerRecordSheet} from "./lecturer-record-sheet";
import {LECTURER_MANAGER_COPY} from "./lecturer-manager-copy";
import {saveAdminPublicationAction, type AdminLecturerRelationFormState} from "./lecturer-relations-actions";
import type {AdminLecturerRelations} from "@/features/academic/lecturer-relations";
import {RecordTable} from "@/components/admin/shared/record-table";
import {RecordDeleteAction} from "@/components/admin/shared/record-delete-action";
import {Button} from "@/components/ui/button";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {PortalSubmitButton} from "@/components/portal/portal-form-status";
import type {AppLocale} from "@/i18n/routing";

type Publication = AdminLecturerRelations["publications"][number];

const TYPES = ["JURNAL", "BUKU", "BAB_BUKU", "PROSIDING", "ARTIKEL", "LAINNYA"] as const;

function PublicationForm({
  lecturerId, item, labels, onSaved,
}: {
  lecturerId: string;
  item: Publication | null;
  labels: (typeof LECTURER_MANAGER_COPY)[AppLocale]["publication"];
  onSaved: () => void;
}) {
  const [state, action, pending] = useActionState(
    saveAdminPublicationAction,
    {status: "idle"} satisfies AdminLecturerRelationFormState,
  );
  const key = item?.id ?? "new";

  useEffect(() => {
    if (state.status === "saved") onSaved();
  }, [state.status, onSaved]);

  return (
    <form action={action} className="flex flex-col gap-5 pt-4">
      <input type="hidden" name="lecturerId" value={lecturerId} />
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`publication-title-${key}`}>{labels.name}</FieldLabel>
          <Input id={`publication-title-${key}`} name="title" required maxLength={500} defaultValue={item?.title ?? ""} dir="auto" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`publication-type-${key}`}>{labels.type}</FieldLabel>
            <select
              id={`publication-type-${key}`}
              name="type"
              defaultValue={item?.type ?? "JURNAL"}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
            >
              {TYPES.map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`publication-year-${key}`}>{labels.year}</FieldLabel>
            <Input id={`publication-year-${key}`} name="year" type="number" min={1900} max={2100} defaultValue={item?.year ?? ""} dir="ltr" />
          </Field>
          <Field>
            <FieldLabel htmlFor={`publication-publisher-${key}`}>{labels.publisher}</FieldLabel>
            <Input id={`publication-publisher-${key}`} name="publisher" maxLength={300} defaultValue={item?.publisher ?? ""} dir="auto" />
          </Field>
          <Field>
            <FieldLabel htmlFor={`publication-doi-${key}`}>{labels.doi}</FieldLabel>
            <Input id={`publication-doi-${key}`} name="doi" maxLength={200} defaultValue={item?.doi ?? ""} dir="ltr" />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor={`publication-url-${key}`}>{labels.url}</FieldLabel>
          <Input id={`publication-url-${key}`} name="url" type="url" maxLength={2048} defaultValue={item?.url ?? ""} dir="ltr" />
        </Field>
      </FieldGroup>
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">{labels.error}</p>
      ) : null}
      <div className="flex justify-end">
        <PortalSubmitButton pending={pending} label={item ? labels.save : labels.add} pendingLabel={labels.save} />
      </div>
    </form>
  );
}

export function PublicationManager({
  locale, lecturerId, publications,
}: {
  locale: AppLocale;
  lecturerId: string;
  publications: readonly Publication[];
}) {
  const labels = LECTURER_MANAGER_COPY[locale].publication;
  const [editing, setEditing] = useState<Publication | null | "closed">("closed");

  return (
    <section className="pt-4">
      <RecordTable<Publication>
        title={labels.title}
        description={labels.description}
        addLabel={labels.add}
        actionsLabel={labels.actions}
        onAdd={() => setEditing(null)}
        rows={publications}
        rowKey={(row) => row.id}
        emptyLabel={labels.empty}
        columns={[
          {key: "title", label: labels.name, render: (row) => <span dir="auto" className="font-medium text-slate-900">{row.title}</span>},
          {key: "type", label: labels.type, render: (row) => <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">{row.type.replace("_", " ")}</span>},
          {key: "year", label: labels.year, render: (row) => <span className="font-mono text-xs tabular-nums">{row.year ?? "—"}</span>},
          {key: "publisher", label: labels.publisher, render: (row) => <span dir="auto" className="text-slate-600">{row.publisher ?? "—"}</span>},
        ]}
        renderCard={(row) => (
          <div>
            <p dir="auto" className="font-semibold text-slate-900">{row.title}</p>
            <p className="mt-1 text-xs text-slate-500">{row.type.replace("_", " ")} · {row.year ?? "—"}</p>
          </div>
        )}
        renderActions={(row) => (
          <>
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditing(row)}>
              <PencilLineIcon data-icon="inline-start" />
              {labels.edit}
            </Button>
            <RecordDeleteAction
              action={saveAdminPublicationAction}
              initialState={{status: "idle"} satisfies AdminLecturerRelationFormState}
              lecturerId={lecturerId}
              item={row}
              subject={(r) => r.title}
              itemId={(r) => r.id}
              labels={labels}
            />
          </>
        )}
      />

      <LecturerRecordSheet
        open={editing !== "closed"}
        onOpenChange={(open) => { if (!open) setEditing("closed"); }}
        title={editing && editing !== "closed" ? labels.editTitle : labels.addTitle}
        description={labels.description}
      >
        {editing !== "closed" ? (
          <PublicationForm
            key={editing?.id ?? "new"}
            lecturerId={lecturerId}
            item={editing}
            labels={labels}
            onSaved={() => setEditing("closed")}
          />
        ) : null}
      </LecturerRecordSheet>
    </section>
  );
}

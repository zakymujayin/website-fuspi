"use client";

import {PencilLineIcon} from "lucide-react";
import {useActionState, useEffect, useState} from "react";

import {LecturerRecordSheet} from "./lecturer-record-sheet";
import {LECTURER_MANAGER_COPY} from "./lecturer-manager-copy";
import {saveAdminEducationAction, type AdminLecturerRelationFormState} from "./lecturer-relations-actions";
import type {AdminLecturerRelations} from "@/features/academic/lecturer-relations";
import {RecordTable} from "@/components/admin/shared/record-table";
import {RecordDeleteAction} from "@/components/admin/shared/record-delete-action";
import {Button} from "@/components/ui/button";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {PortalSubmitButton} from "@/components/portal/portal-form-status";
import type {AppLocale} from "@/i18n/routing";

type Education = AdminLecturerRelations["educations"][number];

function EducationForm({
  lecturerId, item, labels, onSaved,
}: {
  lecturerId: string;
  item: Education | null;
  labels: (typeof LECTURER_MANAGER_COPY)[AppLocale]["education"];
  onSaved: () => void;
}) {
  const [state, action, pending] = useActionState(
    saveAdminEducationAction,
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
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`education-degree-${key}`}>{labels.degree}</FieldLabel>
          <Input id={`education-degree-${key}`} name="degree" required maxLength={100} defaultValue={item?.degree ?? ""} dir="auto" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`education-field-${key}`}>{labels.field}</FieldLabel>
          <Input id={`education-field-${key}`} name="field" maxLength={200} defaultValue={item?.field ?? ""} dir="auto" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`education-institution-${key}`}>{labels.institution}</FieldLabel>
          <Input id={`education-institution-${key}`} name="institution" required maxLength={300} defaultValue={item?.institution ?? ""} dir="auto" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`education-city-${key}`}>{labels.city}</FieldLabel>
          <Input id={`education-city-${key}`} name="city" maxLength={120} defaultValue={item?.city ?? ""} dir="auto" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`education-year-${key}`}>{labels.year}</FieldLabel>
          <Input id={`education-year-${key}`} name="year" type="number" min={1900} max={2100} defaultValue={item?.year ?? ""} dir="ltr" />
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

export function EducationManager({
  locale, lecturerId, educations,
}: {
  locale: AppLocale;
  lecturerId: string;
  educations: readonly Education[];
}) {
  const labels = LECTURER_MANAGER_COPY[locale].education;
  const [editing, setEditing] = useState<Education | null | "closed">("closed");

  return (
    <section className="pt-4">
      <RecordTable<Education>
        title={labels.title}
        description={labels.description}
        addLabel={labels.add}
        actionsLabel={labels.actions}
        onAdd={() => setEditing(null)}
        rows={educations}
        rowKey={(row) => row.id}
        emptyLabel={labels.empty}
        columns={[
          {key: "degree", label: labels.degree, render: (row) => <span dir="auto" className="font-medium text-slate-900">{row.degree}</span>},
          {key: "field", label: labels.field, render: (row) => <span dir="auto">{row.field ?? "—"}</span>},
          {key: "institution", label: labels.institution, render: (row) => <span dir="auto">{[row.institution, row.city].filter(Boolean).join(", ")}</span>},
          {key: "year", label: labels.year, render: (row) => <span className="font-mono text-xs tabular-nums">{row.year ?? "—"}</span>},
        ]}
        renderCard={(row) => (
          <div>
            <p dir="auto" className="font-semibold text-slate-900">{row.degree}</p>
            <p className="mt-1 text-xs text-slate-500">{[row.institution, row.city].filter(Boolean).join(", ")} · {row.year ?? "—"}</p>
          </div>
        )}
        renderActions={(row) => (
          <>
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditing(row)}>
              <PencilLineIcon data-icon="inline-start" />
              {labels.edit}
            </Button>
            <RecordDeleteAction
              action={saveAdminEducationAction}
              initialState={{status: "idle"} satisfies AdminLecturerRelationFormState}
              lecturerId={lecturerId}
              item={row}
              subject={(r) => r.degree}
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
          <EducationForm
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

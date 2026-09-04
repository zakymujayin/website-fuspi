"use client";

import {PencilLineIcon} from "lucide-react";
import {useActionState, useEffect, useState} from "react";

import {LecturerRecordSheet} from "./lecturer-record-sheet";
import {LECTURER_MANAGER_COPY} from "./lecturer-manager-copy";
import {saveAdminTeachingAction, type AdminLecturerAcademicFormState} from "./lecturer-academic-records-actions";
import type {AdminLecturerAcademicRecords} from "@/features/academic/lecturer-academic-records";
import {RecordTable} from "@/components/admin/shared/record-table";
import {RecordDeleteAction} from "@/components/admin/shared/record-delete-action";
import {Button} from "@/components/ui/button";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {PortalSubmitButton} from "@/components/portal/portal-form-status";
import type {AppLocale} from "@/i18n/routing";

type Teaching = AdminLecturerAcademicRecords["teaching"][number];

function TeachingForm({
  lecturerId, item, labels, onSaved,
}: {
  lecturerId: string;
  item: Teaching | null;
  labels: (typeof LECTURER_MANAGER_COPY)[AppLocale]["teaching"];
  onSaved: () => void;
}) {
  const [state, action, pending] = useActionState(
    saveAdminTeachingAction,
    {status: "idle"} satisfies AdminLecturerAcademicFormState,
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
          <FieldLabel htmlFor={`teaching-code-${key}`}>{labels.code}</FieldLabel>
          <Input id={`teaching-code-${key}`} name="courseCode" required maxLength={50} defaultValue={item?.courseCode ?? ""} dir="ltr" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`teaching-program-${key}`}>{labels.program}</FieldLabel>
          <select
            id={`teaching-program-${key}`}
            name="programCode"
            defaultValue={item?.programCode ?? "IAT"}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
          >
            {labels.programs.map((program) => <option key={program.value} value={program.value}>{program.label}</option>)}
          </select>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`teaching-name-${key}`}>{labels.name}</FieldLabel>
          <Input id={`teaching-name-${key}`} name="courseName" required maxLength={255} defaultValue={item?.courseName ?? ""} dir="auto" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`teaching-credits-${key}`}>{labels.credits}</FieldLabel>
          <Input id={`teaching-credits-${key}`} name="credits" type="number" min={0} max={10} defaultValue={item?.credits ?? ""} dir="ltr" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`teaching-semester-${key}`}>{labels.semester}</FieldLabel>
          <Input id={`teaching-semester-${key}`} name="semester" type="number" min={1} max={8} defaultValue={item?.semester ?? ""} dir="ltr" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`teaching-start-${key}`}>{labels.yearStart}</FieldLabel>
          <Input id={`teaching-start-${key}`} name="academicYearStart" type="number" min={1900} max={2100} defaultValue={item?.academicYearStart ?? ""} dir="ltr" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`teaching-end-${key}`}>{labels.yearEnd}</FieldLabel>
          <Input id={`teaching-end-${key}`} name="academicYearEnd" type="number" min={1900} max={2100} defaultValue={item?.academicYearEnd ?? ""} dir="ltr" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`teaching-term-${key}`}>{labels.term}</FieldLabel>
          <select
            id={`teaching-term-${key}`}
            name="term"
            defaultValue={item?.term ?? "GANJIL"}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
          >
            {labels.terms.map((term) => <option key={term.value} value={term.value}>{term.label}</option>)}
          </select>
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

export function TeachingManager({
  locale, lecturerId, teaching,
}: {
  locale: AppLocale;
  lecturerId: string;
  teaching: readonly Teaching[];
}) {
  const labels = LECTURER_MANAGER_COPY[locale].teaching;
  const [editing, setEditing] = useState<Teaching | null | "closed">("closed");

  return (
    <section className="pt-4">
      <RecordTable<Teaching>
        title={labels.title}
        description={labels.description}
        addLabel={labels.add}
        actionsLabel={labels.actions}
        onAdd={() => setEditing(null)}
        rows={teaching}
        rowKey={(row) => row.id}
        emptyLabel={labels.empty}
        columns={[
          {key: "code", label: labels.code, render: (row) => <span className="font-mono text-xs">{row.courseCode}</span>},
          {key: "name", label: labels.name, render: (row) => <span dir="auto" className="font-medium text-slate-900">{row.courseName}</span>},
          {key: "program", label: labels.program, render: (row) => <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">{row.programCode}</span>},
          {key: "period", label: labels.term, render: (row) => (
            <span className="font-mono text-xs tabular-nums">
              {labels.terms.find((term) => term.value === row.term)?.label ?? row.term} {row.academicYearStart}/{row.academicYearEnd}
            </span>
          )},
          {key: "credits", label: labels.credits, align: "end" as const, render: (row) => <span className="tabular-nums">{row.credits}</span>},
        ]}
        renderCard={(row) => (
          <div>
            <p dir="auto" className="font-semibold text-slate-900">{row.courseName}</p>
            <p className="mt-1 text-xs text-slate-500">
              {row.courseCode} · {row.programCode} · {labels.terms.find((term) => term.value === row.term)?.label ?? row.term} {row.academicYearStart}/{row.academicYearEnd}
            </p>
          </div>
        )}
        renderActions={(row) => (
          <>
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditing(row)}>
              <PencilLineIcon data-icon="inline-start" />
              {labels.edit}
            </Button>
            <RecordDeleteAction
              action={saveAdminTeachingAction}
              initialState={{status: "idle"} satisfies AdminLecturerAcademicFormState}
              lecturerId={lecturerId}
              item={row}
              subject={(r) => r.courseName}
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
          <TeachingForm
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

"use client";

import {PencilLineIcon, Trash2Icon} from "lucide-react";
import {useActionState, useEffect, useState} from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {LecturerRecordSheet} from "./lecturer-record-sheet";
import {LECTURER_MANAGER_COPY} from "./lecturer-manager-copy";
import {saveAdminHkiAction, type AdminLecturerAcademicFormState} from "./lecturer-academic-records-actions";
import type {AdminLecturerAcademicRecords} from "@/features/academic/lecturer-academic-records";
import {RecordTable} from "@/components/admin/shared/record-table";
import {Button} from "@/components/ui/button";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {PortalSubmitButton} from "@/components/portal/portal-form-status";
import type {AppLocale} from "@/i18n/routing";

type Hki = AdminLecturerAcademicRecords["hki"][number];

const HKI_TYPES = ["PATEN", "HAK_CIPTA", "MEREK", "DESAIN_INDUSTRI", "LAINNYA"] as const;

function HkiForm({
  lecturerId, item, labels, onSaved,
}: {
  lecturerId: string;
  item: Hki | null;
  labels: (typeof LECTURER_MANAGER_COPY)[AppLocale]["hki"];
  onSaved: () => void;
}) {
  const [state, action, pending] = useActionState(
    saveAdminHkiAction,
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
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`hki-title-${key}`}>{labels.name}</FieldLabel>
          <Input id={`hki-title-${key}`} name="title" required maxLength={500} defaultValue={item?.title ?? ""} dir="auto" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`hki-type-${key}`}>{labels.type}</FieldLabel>
          <select
            id={`hki-type-${key}`}
            name="type"
            defaultValue={item?.type ?? "HAK_CIPTA"}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
          >
            {HKI_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor={`hki-year-${key}`}>{labels.year}</FieldLabel>
          <Input id={`hki-year-${key}`} name="year" type="number" min={1900} max={2100} defaultValue={item?.year ?? ""} dir="ltr" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`hki-registration-${key}`}>{labels.registration}</FieldLabel>
          <Input id={`hki-registration-${key}`} name="registrationNumber" maxLength={191} defaultValue={item?.registrationNumber ?? ""} dir="auto" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`hki-url-${key}`}>{labels.url}</FieldLabel>
          <Input id={`hki-url-${key}`} name="url" type="url" maxLength={2048} defaultValue={item?.url ?? ""} dir="ltr" />
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

function DeleteHkiAction({
  lecturerId, item, labels,
}: {
  lecturerId: string;
  item: Hki;
  labels: (typeof LECTURER_MANAGER_COPY)[AppLocale]["hki"];
}) {
  const [state, action, pending] = useActionState(
    saveAdminHkiAction,
    {status: "idle"} satisfies AdminLecturerAcademicFormState,
  );
  const [open, setOpen] = useState(false);
  const [prevStatus, setPrevStatus] = useState(state.status);
  if (state.status !== prevStatus) {
    setPrevStatus(state.status);
    if (state.status === "saved") setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button type="button" variant="ghost" size="sm" />}>
        <Trash2Icon data-icon="inline-start" />
        {labels.remove}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{labels.confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription dir="auto">
            {labels.confirmDescription.replace("{title}", item.title)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
          <form action={action}>
            <input type="hidden" name="lecturerId" value={lecturerId} />
            <input type="hidden" name="id" value={item.id} />
            <PortalSubmitButton pending={pending} name="intent" value="delete" label={labels.remove} pendingLabel={labels.remove} />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function HkiManager({
  locale, lecturerId, hki,
}: {
  locale: AppLocale;
  lecturerId: string;
  hki: readonly Hki[];
}) {
  const labels = LECTURER_MANAGER_COPY[locale].hki;
  const [editing, setEditing] = useState<Hki | null | "closed">("closed");

  return (
    <section className="pt-4">
      <RecordTable<Hki>
        title={labels.title}
        description={labels.description}
        addLabel={labels.add}
        actionsLabel={labels.actions}
        onAdd={() => setEditing(null)}
        rows={hki}
        rowKey={(row) => row.id}
        emptyLabel={labels.empty}
        columns={[
          {key: "title", label: labels.name, render: (row) => <span dir="auto" className="font-medium text-slate-900">{row.title}</span>},
          {key: "type", label: labels.type, render: (row) => <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">{row.type.replaceAll("_", " ")}</span>},
          {key: "year", label: labels.year, render: (row) => <span className="font-mono text-xs tabular-nums">{row.year ?? "—"}</span>},
          {key: "registration", label: labels.registration, render: (row) => <span dir="auto">{row.registrationNumber ?? "—"}</span>},
        ]}
        renderCard={(row) => (
          <div>
            <p dir="auto" className="font-semibold text-slate-900">{row.title}</p>
            <p className="mt-1 text-xs text-slate-500">{row.type.replaceAll("_", " ")} · {row.year ?? "—"}</p>
          </div>
        )}
        renderActions={(row) => (
          <>
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditing(row)}>
              <PencilLineIcon data-icon="inline-start" />
              {labels.edit}
            </Button>
            <DeleteHkiAction lecturerId={lecturerId} item={row} labels={labels} />
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
          <HkiForm
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

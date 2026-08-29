"use client";

import {useActionState} from "react";

import {saveEducationAction, type PortalFormState} from "@/components/portal/lecturer-portal-server-actions";
import {PortalFormStatus, PortalSubmitButton, type PortalStatusLabels} from "@/components/portal/portal-form-status";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";

export type EducationItem = {
  id: string;
  degree: string;
  field: string;
  institution: string;
  city: string;
  year: string;
};

export type EducationLabels = PortalStatusLabels & {
  degree: string;
  field: string;
  institution: string;
  city: string;
  year: string;
  save: string;
  saving: string;
  add: string;
  adding: string;
  remove: string;
  removing: string;
  addTitle: string;
  empty: string;
};

const INITIAL: PortalFormState = {status: "idle"};
const EMPTY: EducationItem = {id: "", degree: "", field: "", institution: "", city: "", year: ""};

function EducationRowForm({item, labels}: {item: EducationItem; labels: EducationLabels}) {
  const [state, action, pending] = useActionState(saveEducationAction, INITIAL);
  const isNew = item.id === "";

  return (
    <form action={action} className="rounded-xl border border-slate-200 bg-white p-5">
      {isNew ? null : <input type="hidden" name="id" value={item.id} />}
      <FieldGroup className="sm:grid sm:grid-cols-2 sm:gap-4">
        <Field>
          <FieldLabel htmlFor={`degree-${item.id || "new"}`}>{labels.degree}</FieldLabel>
          <Input
            id={`degree-${item.id || "new"}`}
            name="degree"
            required
            maxLength={100}
            defaultValue={item.degree}
            dir="auto"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`field-${item.id || "new"}`}>{labels.field}</FieldLabel>
          <Input id={`field-${item.id || "new"}`} name="field" maxLength={200} defaultValue={item.field} dir="auto" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`institution-${item.id || "new"}`}>{labels.institution}</FieldLabel>
          <Input
            id={`institution-${item.id || "new"}`}
            name="institution"
            required
            maxLength={300}
            defaultValue={item.institution}
            dir="auto"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`city-${item.id || "new"}`}>{labels.city}</FieldLabel>
          <Input id={`city-${item.id || "new"}`} name="city" maxLength={120} defaultValue={item.city} dir="auto" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`year-${item.id || "new"}`}>{labels.year}</FieldLabel>
          <Input
            id={`year-${item.id || "new"}`}
            name="year"
            type="number"
            inputMode="numeric"
            min={1900}
            max={2100}
            defaultValue={item.year}
            dir="ltr"
          />
        </Field>
      </FieldGroup>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <PortalSubmitButton
          pending={pending}
          label={isNew ? labels.add : labels.save}
          pendingLabel={isNew ? labels.adding : labels.saving}
        />
        {isNew ? null : (
          <PortalSubmitButton
            pending={pending}
            variant="quiet"
            name="intent"
            value="delete"
            label={labels.remove}
            pendingLabel={labels.removing}
          />
        )}
        <PortalFormStatus state={state} labels={labels} />
      </div>
    </form>
  );
}

export function EducationManager({items, labels}: {items: EducationItem[]; labels: EducationLabels}) {
  return (
    <div className="space-y-6">
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{labels.empty}</p>
      ) : (
        items.map((item) => <EducationRowForm key={item.id} item={item} labels={labels} />)
      )}

      <section aria-labelledby="education-add">
        <h2 id="education-add" className="font-display text-sm font-semibold text-slate-900">
          {labels.addTitle}
        </h2>
        <div className="mt-3">
          {/* Keying on the saved count remounts the add form after each new
              entry, so its fields start empty instead of holding the last one. */}
          <EducationRowForm key={`new-${items.length}`} item={EMPTY} labels={labels} />
        </div>
      </section>
    </div>
  );
}

"use client";

import {useActionState} from "react";

import {savePublicationAction, type PortalFormState} from "@/components/portal/lecturer-portal-server-actions";
import {PortalFormStatus, PortalSubmitButton, type PortalStatusLabels} from "@/components/portal/portal-form-status";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";

export type PublicationItem = {
  id: string;
  title: string;
  type: string;
  year: string;
  publisher: string;
  url: string;
  doi: string;
};

export type PublicationLabels = PortalStatusLabels & {
  title: string;
  type: string;
  year: string;
  publisher: string;
  url: string;
  doi: string;
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
const EMPTY: PublicationItem = {id: "", title: "", type: "JURNAL", year: "", publisher: "", url: "", doi: ""};

function PublicationRowForm({
  item,
  labels,
  types,
}: {
  item: PublicationItem;
  labels: PublicationLabels;
  types: ReadonlyArray<{value: string; label: string}>;
}) {
  const [state, action, pending] = useActionState(savePublicationAction, INITIAL);
  const isNew = item.id === "";
  const key = item.id || "new";

  return (
    <form action={action} className="rounded-xl border border-slate-200 bg-white p-5">
      {isNew ? null : <input type="hidden" name="id" value={item.id} />}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`title-${key}`}>{labels.title}</FieldLabel>
          <Input id={`title-${key}`} name="title" required maxLength={500} defaultValue={item.title} dir="auto" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`type-${key}`}>{labels.type}</FieldLabel>
            <select
              id={`type-${key}`}
              name="type"
              defaultValue={item.type}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-royal-500 focus:outline-2 focus:outline-offset-0 focus:outline-royal-500"
            >
              {types.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`year-${key}`}>{labels.year}</FieldLabel>
            <Input
              id={`year-${key}`}
              name="year"
              type="number"
              inputMode="numeric"
              min={1900}
              max={2100}
              defaultValue={item.year}
              dir="ltr"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`publisher-${key}`}>{labels.publisher}</FieldLabel>
            <Input id={`publisher-${key}`} name="publisher" maxLength={300} defaultValue={item.publisher} dir="auto" />
          </Field>
          <Field>
            <FieldLabel htmlFor={`doi-${key}`}>{labels.doi}</FieldLabel>
            <Input id={`doi-${key}`} name="doi" maxLength={200} defaultValue={item.doi} dir="ltr" />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor={`url-${key}`}>{labels.url}</FieldLabel>
          <Input id={`url-${key}`} name="url" type="url" maxLength={2048} defaultValue={item.url} dir="ltr" />
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

export function PublicationManager({
  items,
  labels,
  types,
}: {
  items: PublicationItem[];
  labels: PublicationLabels;
  types: ReadonlyArray<{value: string; label: string}>;
}) {
  return (
    <div className="space-y-6">
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{labels.empty}</p>
      ) : (
        items.map((item) => (
          <PublicationRowForm key={item.id} item={item} labels={labels} types={types} />
        ))
      )}

      <section aria-labelledby="publication-add">
        <h2 id="publication-add" className="font-display text-sm font-semibold text-slate-900">
          {labels.addTitle}
        </h2>
        <div className="mt-3">
          {/* Keying on the saved count remounts the add form after each new
              entry, so its fields start empty instead of holding the last one. */}
          <PublicationRowForm key={`new-${items.length}`} item={EMPTY} labels={labels} types={types} />
        </div>
      </section>
    </div>
  );
}

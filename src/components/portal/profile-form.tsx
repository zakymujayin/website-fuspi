"use client";

import {useActionState, useState} from "react";

import {PageRichTextField} from "@/components/admin/pages/page-rich-text-field";
import {saveProfileAction, type PortalFormState} from "@/components/portal/lecturer-portal-server-actions";
import {PortalFormStatus, PortalSubmitButton} from "@/components/portal/portal-form-status";
import {Field, FieldDescription, FieldGroup, FieldLabel, FieldSet} from "@/components/ui/field";
import {Input} from "@/components/ui/input";

export type ProfileFormValues = {
  position: string;
  expertise: string;
  bio: string;
  quote: string;
  officeHours: string;
  officeLocation: string;
  phone: string;
  googleScholarUrl: string;
  sintaUrl: string;
  scopusUrl: string;
  linkedinUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  /* Carried through untouched: the portal has no media picker yet, and
     omitting these would clear the stored photo and CV on every save. */
  photoMediaId: string;
  cvMediaId: string;
};

export type ProfileFormLabels = Record<
  /* The media ids ride along as hidden inputs, so they need no label. */
  | Exclude<keyof ProfileFormValues, "photoMediaId" | "cvMediaId">
  | "identitySection" | "contactSection" | "linksSection"
  | "bioHint" | "quoteHint" | "urlHint" | "save" | "saving" | "saved"
  | "errorValidation" | "errorSession" | "errorUnavailable",
  string
>;

const INITIAL: PortalFormState = {status: "idle"};

export function ProfileForm({values, labels}: {values: ProfileFormValues; labels: ProfileFormLabels}) {
  const [state, action, pending] = useActionState(saveProfileAction, INITIAL);
  /* The biography is stored as HTML. Editing it in a plain textarea would show
     the lecturer raw markup, so the shared rich-text field owns the value and a
     hidden input carries it into the form action. */
  const [bio, setBio] = useState(values.bio);

  return (
    <form action={action} className="max-w-3xl">
      <input type="hidden" name="photoMediaId" value={values.photoMediaId} />
      <input type="hidden" name="cvMediaId" value={values.cvMediaId} />
      <FieldSet>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="position">{labels.position}</FieldLabel>
            <Input id="position" name="position" defaultValue={values.position} maxLength={200} />
          </Field>
          <Field>
            <FieldLabel htmlFor="expertise">{labels.expertise}</FieldLabel>
            <Input id="expertise" name="expertise" defaultValue={values.expertise} maxLength={500} />
          </Field>
          <Field>
            <FieldLabel htmlFor="bio">{labels.bio}</FieldLabel>
            <input type="hidden" name="bio" value={bio} />
            <PageRichTextField value={bio} onChange={setBio} ariaLabel={labels.bio} />
            <FieldDescription>{labels.bioHint}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="quote">{labels.quote}</FieldLabel>
            <Input id="quote" name="quote" defaultValue={values.quote} maxLength={500} dir="auto" />
            <FieldDescription>{labels.quoteHint}</FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet className="mt-10">
        <legend className="font-display text-sm font-semibold text-slate-900">{labels.contactSection}</legend>
        <FieldGroup className="mt-4">
          <Field>
            <FieldLabel htmlFor="phone">{labels.phone}</FieldLabel>
            <Input id="phone" name="phone" defaultValue={values.phone} maxLength={50} dir="ltr" />
          </Field>
          <Field>
            <FieldLabel htmlFor="officeLocation">{labels.officeLocation}</FieldLabel>
            <Input id="officeLocation" name="officeLocation" defaultValue={values.officeLocation} maxLength={200} />
          </Field>
          <Field>
            <FieldLabel htmlFor="officeHours">{labels.officeHours}</FieldLabel>
            <Input id="officeHours" name="officeHours" defaultValue={values.officeHours} maxLength={200} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet className="mt-10">
        <legend className="font-display text-sm font-semibold text-slate-900">{labels.linksSection}</legend>
        <FieldDescription className="mt-1">{labels.urlHint}</FieldDescription>
        <FieldGroup className="mt-4">
          {([
            ["googleScholarUrl", labels.googleScholarUrl],
            ["sintaUrl", labels.sintaUrl],
            ["scopusUrl", labels.scopusUrl],
            ["linkedinUrl", labels.linkedinUrl],
            ["instagramUrl", labels.instagramUrl],
            ["twitterUrl", labels.twitterUrl],
          ] as const).map(([key, label]) => (
            <Field key={key}>
              <FieldLabel htmlFor={key}>{label}</FieldLabel>
              <Input id={key} name={key} type="url" defaultValue={values[key]} maxLength={2048} dir="ltr" />
            </Field>
          ))}
        </FieldGroup>
      </FieldSet>

      <div className="mt-8 flex items-center gap-4">
        <PortalSubmitButton pending={pending} label={labels.save} pendingLabel={labels.saving} />
        <PortalFormStatus
          state={state}
          labels={{
            saved: labels.saved,
            errorValidation: labels.errorValidation,
            errorSession: labels.errorSession,
            errorUnavailable: labels.errorUnavailable,
          }}
        />
      </div>
    </form>
  );
}

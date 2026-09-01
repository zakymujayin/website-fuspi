"use client";

import {useActionState, useRef, useState} from "react";
import {FileTextIcon, ImageIcon, UploadIcon, XIcon} from "lucide-react";

import {PageRichTextField} from "@/components/admin/pages/page-rich-text-field";
import {saveProfileAction, type PortalFormState} from "@/components/portal/lecturer-portal-server-actions";
import {PortalFormStatus, PortalSubmitButton} from "@/components/portal/portal-form-status";
import {Button} from "@/components/ui/button";
import {Field, FieldDescription, FieldGroup, FieldLabel, FieldSet} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Spinner} from "@/components/ui/spinner";
import {
  LecturerPortalMediaUploadResponseSchema,
  type LecturerPortalMediaUploadKind,
} from "@/contracts/lecturer-portal";

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
  photoMediaId: string;
  photoUrl: string;
  photoAlt: string;
  cvMediaId: string;
  cvUrl: string;
  cvName: string;
};

export type ProfileFormLabels = Record<
  | Exclude<keyof ProfileFormValues, "photoMediaId" | "photoUrl" | "photoAlt" | "cvMediaId" | "cvUrl" | "cvName">
  | "identitySection" | "contactSection" | "linksSection"
  | "mediaSection" | "photoLabel" | "photoHint" | "photoEmpty" | "photoChoose" | "photoUploading" | "photoReady"
  | "cvLabel" | "cvHint" | "cvEmpty" | "cvChoose" | "cvUploading" | "cvReady"
  | "clearMedia" | "uploadErrorValidation" | "uploadErrorSession" | "uploadErrorUnavailable"
  | "bioHint" | "quoteHint" | "urlHint" | "save" | "saving" | "saved"
  | "errorValidation" | "errorSession" | "errorUnavailable",
  string
>;

const INITIAL: PortalFormState = {status: "idle"};
const ACCEPTED_PHOTO = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const ACCEPTED_CV = "application/pdf,.pdf";

type UploadedMedia = {
  mediaId: string;
  url: string;
  name: string;
  alt: string;
};

function uploadErrorLabel(code: string, labels: ProfileFormLabels) {
  if (code === "SESSION_INVALID" || code === "CSRF_INVALID") return labels.uploadErrorSession;
  if (code === "VALIDATION_FAILED" || code === "REQUEST_INVALID") return labels.uploadErrorValidation;
  return labels.uploadErrorUnavailable;
}

function initialPhoto(values: ProfileFormValues, labels: ProfileFormLabels): UploadedMedia | null {
  return values.photoMediaId && values.photoUrl
    ? {mediaId: values.photoMediaId, url: values.photoUrl, name: labels.photoLabel, alt: values.photoAlt}
    : null;
}

function initialCv(values: ProfileFormValues, labels: ProfileFormLabels): UploadedMedia | null {
  return values.cvMediaId && values.cvUrl
    ? {mediaId: values.cvMediaId, url: values.cvUrl, name: values.cvName || labels.cvLabel, alt: ""}
    : null;
}

function ProfileMediaUpload({
  kind,
  media,
  labels,
  onChange,
}: {
  kind: LecturerPortalMediaUploadKind;
  media: UploadedMedia | null;
  labels: ProfileFormLabels;
  onChange: (media: UploadedMedia | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isPhoto = kind === "PHOTO";
  const label = isPhoto ? labels.photoLabel : labels.cvLabel;
  const hint = isPhoto ? labels.photoHint : labels.cvHint;
  const empty = isPhoto ? labels.photoEmpty : labels.cvEmpty;
  const choose = isPhoto ? labels.photoChoose : labels.cvChoose;
  const uploading = isPhoto ? labels.photoUploading : labels.cvUploading;
  const ready = isPhoto ? labels.photoReady : labels.cvReady;

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setStatus(uploading);
    try {
      const formData = new FormData();
      formData.set("kind", kind);
      formData.set("file", file);
      const response = await fetch("/api/portal/lecturer/media/upload", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const parsed = LecturerPortalMediaUploadResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        setError(uploadErrorLabel("UNAVAILABLE", labels));
        setStatus(null);
        return;
      }
      if (!parsed.data.ok) {
        setError(uploadErrorLabel(parsed.data.code, labels));
        setStatus(null);
        return;
      }
      onChange({
        mediaId: parsed.data.mediaId,
        url: parsed.data.url,
        name: parsed.data.originalName,
        alt: isPhoto ? label : "",
      });
      setStatus(ready);
    } catch {
      setError(labels.uploadErrorUnavailable);
      setStatus(null);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Field className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
          {media?.url && isPhoto ? (
            /* eslint-disable-next-line @next/next/no-img-element -- portal previews use runtime upload storage URLs. */
            <img src={media.url} alt={media.alt || label} className="size-full object-cover" />
          ) : media?.url ? (
            <FileTextIcon aria-hidden className="size-8 text-slate-500" strokeWidth={1.5} />
          ) : isPhoto ? (
            <ImageIcon aria-hidden className="size-8 text-slate-400" strokeWidth={1.5} />
          ) : (
            <FileTextIcon aria-hidden className="size-8 text-slate-400" strokeWidth={1.5} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <FieldLabel htmlFor={`portal-${kind.toLowerCase()}-upload`}>{label}</FieldLabel>
          <FieldDescription className="mt-1">{hint}</FieldDescription>
          <p className="mt-2 truncate text-sm text-slate-700">{media?.name || empty}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Input
              ref={inputRef}
              id={`portal-${kind.toLowerCase()}-upload`}
              type="file"
              accept={isPhoto ? ACCEPTED_PHOTO : ACCEPTED_CV}
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) void upload(file);
              }}
            />
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? <Spinner data-icon /> : <UploadIcon data-icon />}
              {choose}
            </Button>
            {media ? (
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onChange(null)}>
                <XIcon data-icon />
                {labels.clearMedia}
              </Button>
            ) : null}
          </div>
          <div aria-live="polite" className="mt-2 min-h-5 text-sm">
            {error ? <span className="text-destructive">{error}</span> : null}
            {!error && status ? <span className="text-emerald-700">{status}</span> : null}
          </div>
        </div>
      </div>
    </Field>
  );
}

export function ProfileForm({values, labels}: {values: ProfileFormValues; labels: ProfileFormLabels}) {
  const [state, action, pending] = useActionState(saveProfileAction, INITIAL);
  /* The biography is stored as HTML. Editing it in a plain textarea would show
     the lecturer raw markup, so the shared rich-text field owns the value and a
     hidden input carries it into the form action. */
  const [bio, setBio] = useState(values.bio);
  const [photo, setPhoto] = useState<UploadedMedia | null>(() => initialPhoto(values, labels));
  const [cv, setCv] = useState<UploadedMedia | null>(() => initialCv(values, labels));

  return (
    <form action={action} className="max-w-4xl">
      <input type="hidden" name="photoMediaId" value={photo?.mediaId ?? ""} />
      <input type="hidden" name="cvMediaId" value={cv?.mediaId ?? ""} />
      <FieldSet>
        <legend className="font-display text-sm font-semibold text-slate-900">{labels.mediaSection}</legend>
        <FieldGroup className="mt-4 grid gap-4 md:grid-cols-2">
          <ProfileMediaUpload kind="PHOTO" media={photo} labels={labels} onChange={setPhoto} />
          <ProfileMediaUpload kind="CV" media={cv} labels={labels} onChange={setCv} />
        </FieldGroup>
      </FieldSet>

      <FieldSet className="mt-10">
        <legend className="font-display text-sm font-semibold text-slate-900">{labels.identitySection}</legend>
        <FieldGroup className="mt-4">
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

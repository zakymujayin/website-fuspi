"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type PasswordFieldProps = {
  id: string;
  label: string;
  showLabel: string;
  hideLabel: string;
  value: string;
  readOnly?: boolean;
  onValueChange: (value: string) => void;
};

/**
 * Password input with a reveal toggle. The toggle is a `type="button"` so it can
 * never submit the form, and it sits after the input in DOM order so the tab
 * sequence stays input → toggle → submit.
 */
export function PasswordField({
  id,
  label,
  showLabel,
  hideLabel,
  value,
  readOnly,
  onValueChange,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          aria-required
          required
          dir="ltr"
          className="pe-12 text-start"
          readOnly={readOnly}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-pressed={visible}
          aria-controls={id}
          aria-label={visible ? hideLabel : showLabel}
          onClick={() => setVisible((current) => !current)}
          className="absolute end-1 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
        >
          {visible ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
        </Button>
      </div>
    </Field>
  );
}

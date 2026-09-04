"use client";

import {Trash2Icon} from "lucide-react";
import {useActionState, useState} from "react";

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
import {Button} from "@/components/ui/button";
import {PortalSubmitButton} from "@/components/portal/portal-form-status";

export type RecordDeleteActionLabels = {
  remove: string;
  confirmTitle: string;
  confirmDescription: string;
  cancel: string;
};

export function RecordDeleteAction<TItem, TState extends {status: string}>({
  action, initialState, lecturerId, item, subject, itemId, labels,
}: {
  action: (state: Awaited<TState>, formData: FormData) => TState | Promise<TState>;
  initialState: Awaited<TState>;
  lecturerId: string;
  item: TItem;
  subject: (item: TItem) => string;
  itemId: (item: TItem) => string;
  labels: RecordDeleteActionLabels;
}) {
  const [state, formAction, pending] = useActionState<TState, FormData>(action, initialState);
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
            {labels.confirmDescription.replace("{title}", subject(item))}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="lecturerId" value={lecturerId} />
            <input type="hidden" name="id" value={itemId(item)} />
            <PortalSubmitButton pending={pending} name="intent" value="delete" label={labels.remove} pendingLabel={labels.remove} />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

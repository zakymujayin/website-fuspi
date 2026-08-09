"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PageDeleteAction } from "./page-delete-action";
import { PageEditorForm } from "./page-editor-form";
import type { HeroPreview } from "./page-hero-picker";
import { PagePublicationActions } from "./page-publication-actions";
import type { PageEditorDraft } from "./page-editor-payload";
import type { AdminPagePublicationState } from "./page-status-badge";

type PageEditorShellProps = {
  pageId: string;
  initialVersion: number;
  initialDraft: PageEditorDraft;
  initialHero: HeroPreview | null;
  uploadPublicUrl: string;
  listHref: string;
  publicationState: AdminPagePublicationState;
  capabilities: { publish: boolean; delete: boolean };
};

export function PageEditorShell({
  pageId,
  initialVersion,
  initialDraft,
  initialHero,
  uploadPublicUrl,
  listHref,
  publicationState,
  capabilities,
}: PageEditorShellProps) {
  const [version, setVersion] = useState(initialVersion);
  const versionRef = useRef(initialVersion);
  const activeMutationRef = useRef<number | null>(null);
  const nextMutationTokenRef = useRef(0);
  const [mutationBusy, setMutationBusy] = useState(false);

  const [prevInitialVersion, setPrevInitialVersion] = useState(initialVersion);
  if (initialVersion !== prevInitialVersion) {
    setPrevInitialVersion(initialVersion);
    setVersion(initialVersion);
  }
  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  const beginMutation = useCallback(() => {
    if (activeMutationRef.current !== null) return null;
    const token = nextMutationTokenRef.current + 1;
    nextMutationTokenRef.current = token;
    activeMutationRef.current = token;
    setMutationBusy(true);
    return { token, version: versionRef.current };
  }, []);

  const finishMutation = useCallback((token: number, nextVersion?: number) => {
    if (activeMutationRef.current !== token) return;
    if (typeof nextVersion === "number") {
      versionRef.current = nextVersion;
      setVersion(nextVersion);
    }
    activeMutationRef.current = null;
    setMutationBusy(false);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <PagePublicationActions
        pageId={pageId}
        state={publicationState}
        canPublish={capabilities.publish}
        mutationBusy={mutationBusy}
        beginMutation={beginMutation}
        finishMutation={finishMutation}
      />

      <PageEditorForm
        mode="edit"
        listHref={listHref}
        initialDraft={initialDraft}
        pageId={pageId}
        expectedVersion={version}
        initialHero={initialHero}
        uploadPublicUrl={uploadPublicUrl}
        mutationBusy={mutationBusy}
        beginMutation={beginMutation}
        finishMutation={finishMutation}
      />

      <PageDeleteAction
        pageId={pageId}
        canDelete={capabilities.delete}
        listHref={listHref}
        mutationBusy={mutationBusy}
        beginMutation={beginMutation}
        finishMutation={finishMutation}
      />
    </div>
  );
}

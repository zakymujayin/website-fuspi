"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PostDeleteAction } from "./post-delete-action";
import { PostEditorForm } from "./post-editor-form";
import type { CoverPreview } from "./post-cover-picker";
import type { PostEditorDraft } from "./post-editor-payload";
import type { PostTaxonomyOptions } from "@/components/admin/taxonomy/taxonomy-options";
import { PostPublicationActions } from "./post-publication-actions";
import type { AdminPostPublicationState } from "./post-status-badge";

type PostEditorShellProps = {
  postId: string;
  /** The server's version at load; the shared source of truth for optimistic locking. */
  initialVersion: number;
  initialDraft: PostEditorDraft;
  taxonomyOptions: PostTaxonomyOptions;
  initialCover: CoverPreview | null;
  uploadPublicUrl: string;
  listHref: string;
  publicationState: AdminPostPublicationState;
  capabilities: { publish: boolean; delete: boolean };
};

/**
 * Owns the single, shared `version` for the whole edit page so that autosave, manual save,
 * publication, and delete all lock against the same value. A tokenized lease serializes their
 * requests and advances `versionRef` before the next writer can acquire it. Publication/delete also
 * refresh the server, whose newer `initialVersion` is adopted below.
 */
export function PostEditorShell({
  postId,
  initialVersion,
  initialDraft,
  taxonomyOptions,
  initialCover,
  uploadPublicUrl,
  listHref,
  publicationState,
  capabilities,
}: PostEditorShellProps) {
  const [version, setVersion] = useState(initialVersion);
  const versionRef = useRef(initialVersion);
  const activeMutationRef = useRef<number | null>(null);
  const nextMutationTokenRef = useRef(0);
  const [mutationBusy, setMutationBusy] = useState(false);

  // Adopt the server's version whenever it advances (after a publication/delete router.refresh()).
  // Between refreshes `initialVersion` is unchanged, so an autosave-advanced local version is kept.
  // This adjusts state during render (the React-sanctioned pattern) rather than in an effect, so it
  // takes effect without an extra render and does not trip `react-hooks/set-state-in-effect`.
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
    // A stale request must never release a newer mutation's lock.
    if (activeMutationRef.current !== token) return;
    if (typeof nextVersion === "number") {
      versionRef.current = nextVersion;
      setVersion(nextVersion);
    }
    activeMutationRef.current = null;
    setMutationBusy(false);
  }, []);

  return (
    <>
      <PostPublicationActions
        postId={postId}
        state={publicationState}
        canPublish={capabilities.publish}
        mutationBusy={mutationBusy}
        beginMutation={beginMutation}
        finishMutation={finishMutation}
      />

      <PostEditorForm
        mode="edit"
        listHref={listHref}
        initialDraft={initialDraft}
        postId={postId}
        expectedVersion={version}
        taxonomyOptions={taxonomyOptions}
        initialCover={initialCover}
        uploadPublicUrl={uploadPublicUrl}
        mutationBusy={mutationBusy}
        beginMutation={beginMutation}
        finishMutation={finishMutation}
      />

      <PostDeleteAction
        postId={postId}
        canDelete={capabilities.delete}
        listHref={listHref}
        mutationBusy={mutationBusy}
        beginMutation={beginMutation}
        finishMutation={finishMutation}
      />
    </>
  );
}

"use client";

import { useState } from "react";

import { PostDeleteAction } from "./post-delete-action";
import { PostEditorForm } from "./post-editor-form";
import type { CoverPreview } from "./post-cover-picker";
import type { PostEditorCarriedFields, PostEditorDraft } from "./post-editor-payload";
import { PostPublicationActions } from "./post-publication-actions";
import type { AdminPostPublicationState } from "./post-status-badge";

type PostEditorShellProps = {
  postId: string;
  /** The server's version at load; the shared source of truth for optimistic locking. */
  initialVersion: number;
  initialDraft: PostEditorDraft;
  carried: PostEditorCarriedFields;
  initialCover: CoverPreview | null;
  uploadPublicUrl: string;
  listHref: string;
  publicationState: AdminPostPublicationState;
  capabilities: { publish: boolean; delete: boolean };
};

/**
 * Owns the single, shared `version` for the whole edit page so that autosave, manual save,
 * publication, and delete all lock against the same value. Autosave bumps the version client-side
 * (`onVersionChange`); publication/delete refresh the server, which sends a newer `initialVersion`
 * that the effect adopts. Without this, an autosave would make the publish/delete buttons stale and
 * they would fail with VERSION_CONFLICT.
 */
export function PostEditorShell({
  postId,
  initialVersion,
  initialDraft,
  carried,
  initialCover,
  uploadPublicUrl,
  listHref,
  publicationState,
  capabilities,
}: PostEditorShellProps) {
  const [version, setVersion] = useState(initialVersion);

  // Adopt the server's version whenever it advances (after a publication/delete router.refresh()).
  // Between refreshes `initialVersion` is unchanged, so an autosave-advanced local version is kept.
  // This adjusts state during render (the React-sanctioned pattern) rather than in an effect, so it
  // takes effect without an extra render and does not trip `react-hooks/set-state-in-effect`.
  const [prevInitialVersion, setPrevInitialVersion] = useState(initialVersion);
  if (initialVersion !== prevInitialVersion) {
    setPrevInitialVersion(initialVersion);
    setVersion(initialVersion);
  }

  return (
    <>
      <PostPublicationActions
        postId={postId}
        expectedVersion={version}
        state={publicationState}
        canPublish={capabilities.publish}
      />

      <PostEditorForm
        mode="edit"
        listHref={listHref}
        initialDraft={initialDraft}
        postId={postId}
        expectedVersion={version}
        carried={carried}
        initialCover={initialCover}
        uploadPublicUrl={uploadPublicUrl}
        onVersionChange={setVersion}
      />

      <PostDeleteAction
        postId={postId}
        expectedVersion={version}
        canDelete={capabilities.delete}
        listHref={listHref}
      />
    </>
  );
}

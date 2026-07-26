import type { AdminPostPublicationState } from "./post-status-badge";

/** The publication intents the transport accepts, from `PostPublicationMutationInputSchema`. */
export type PostPublicationIntent =
  | "PUBLISH_NOW"
  | "SCHEDULE"
  | "RETURN_TO_DRAFT"
  | "ARCHIVE";

/**
 * Mirrors the frozen `ALLOWED_TRANSITIONS` in `src/contracts/post.ts`, keyed by the post's *status*
 * (DRAFT / PUBLISHED / ARCHIVED). This is a UX convenience only — the server validates every
 * transition via `PostPublicationTransitionSchema` and rejects an illegal one with `INVALID_STATE`.
 * Keep this in step with the contract; if it drifts, the server still fails closed.
 *
 * A future-dated PUBLISHED post surfaces as the SCHEDULED publication state, but its underlying
 * status is still PUBLISHED, so it uses the PUBLISHED row here.
 */
const ALLOWED_INTENTS_BY_STATUS: Record<
  "DRAFT" | "PUBLISHED" | "ARCHIVED",
  readonly PostPublicationIntent[]
> = {
  DRAFT: ["PUBLISH_NOW", "SCHEDULE", "ARCHIVE"],
  PUBLISHED: ["SCHEDULE", "RETURN_TO_DRAFT", "ARCHIVE"],
  ARCHIVED: ["RETURN_TO_DRAFT"],
};

/** Maps the display publication state to its underlying status for transition lookup. */
function statusOf(state: AdminPostPublicationState): "DRAFT" | "PUBLISHED" | "ARCHIVED" {
  switch (state) {
    case "DRAFT":
      return "DRAFT";
    case "ARCHIVED":
      return "ARCHIVED";
    // PUBLISHED and SCHEDULED are both the PUBLISHED status.
    default:
      return "PUBLISHED";
  }
}

/** Intents available from a given publication state, or none when the actor cannot publish. */
export function availableIntents(
  state: AdminPostPublicationState,
  canPublish: boolean,
): readonly PostPublicationIntent[] {
  if (!canPublish) return [];
  return ALLOWED_INTENTS_BY_STATUS[statusOf(state)];
}

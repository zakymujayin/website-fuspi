import {
  AuthorizationContextSchema,
  type AuthorizationContext,
} from "@/contracts/auth";
import {
  getPermissionRule,
  type AuthAction,
  type AuthResource,
  type PermissionDataScope,
} from "@/lib/auth/permission-matrix";

export type AuthorizationDecision = Readonly<{
  allowed: boolean;
  dataScope: PermissionDataScope;
}>;

const DENIED: AuthorizationDecision = Object.freeze({allowed: false, dataScope: "NONE"});

export function authorize(
  context: AuthorizationContext | unknown,
  action: AuthAction,
  resource: AuthResource,
): AuthorizationDecision {
  const parsed = AuthorizationContextSchema.safeParse(context);
  if (!parsed.success) return DENIED;
  const rule = getPermissionRule(parsed.data.actor.role, action, resource);
  if (!rule.allowed) return DENIED;
  if (
    rule.ownership === "OWN" &&
    parsed.data.resourceOwnerId !== parsed.data.actor.userId
  ) {
    return DENIED;
  }
  const requiredTicketScope =
    rule.dataScope === "NON_PPKS" ||
    rule.dataScope === "PPKS_AGGREGATE" ||
    rule.dataScope === "PPKS_DETAIL"
      ? rule.dataScope
      : null;
  if (requiredTicketScope && parsed.data.ticketScope !== requiredTicketScope) {
    return DENIED;
  }
  return Object.freeze({allowed: true, dataScope: rule.dataScope});
}

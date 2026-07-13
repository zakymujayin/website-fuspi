import type {AuthRole} from "@/contracts/auth";

export const AUTH_ACTIONS = [
  "VIEW", "CREATE", "UPDATE", "DELETE", "PUBLISH", "SCHEDULE", "ASSIGN",
  "EXPORT", "DOWNLOAD", "REPLY", "APPROVE", "CHANGE_ROLE", "CHANGE_PASSWORD",
] as const;

export const AUTH_RESOURCES = [
  "POST", "MEDIA", "CMS", "USER", "BOOKING", "TICKET", "PPKS_AGGREGATE",
  "PPKS_TICKET", "PPKS_ACCESS_LOG", "AUDIT_LOG",
] as const;

export type AuthAction = (typeof AUTH_ACTIONS)[number];
export type AuthResource = (typeof AUTH_RESOURCES)[number];
export type OwnershipRequirement = "NONE" | "ANY" | "OWN";
export type PermissionDataScope =
  | "NONE" | "ALL" | "NON_PPKS" | "PPKS_AGGREGATE" | "PPKS_DETAIL"
  | "PPKS_ACCESS_LOG";

export type PermissionRule = Readonly<{
  allowed: boolean;
  ownership: OwnershipRequirement;
  dataScope: PermissionDataScope;
}>;

type PermissionMatrix = Record<
  AuthRole,
  Record<AuthResource, Record<AuthAction, PermissionRule>>
>;

const ROLES: readonly AuthRole[] = ["ADMIN", "EDITOR", "PETUGAS", "SATGAS_PPKS"];
const DENY: PermissionRule = Object.freeze({
  allowed: false,
  ownership: "NONE",
  dataScope: "NONE",
});

function createDeniedMatrix(): PermissionMatrix {
  return Object.fromEntries(
    ROLES.map((role) => [role, Object.fromEntries(
      AUTH_RESOURCES.map((resource) => [resource, Object.fromEntries(
        AUTH_ACTIONS.map((action) => [action, DENY]),
      )]),
    )]),
  ) as PermissionMatrix;
}

function grant(
  matrix: PermissionMatrix,
  role: AuthRole,
  resource: AuthResource,
  actions: readonly AuthAction[],
  rule: Omit<PermissionRule, "allowed">,
) {
  for (const action of actions) {
    matrix[role][resource][action] = Object.freeze({allowed: true, ...rule});
  }
}

function buildPermissionMatrix(): PermissionMatrix {
  const matrix = createDeniedMatrix();
  const any = {ownership: "ANY", dataScope: "ALL"} as const;
  const own = {ownership: "OWN", dataScope: "ALL"} as const;
  const nonPpks = {ownership: "ANY", dataScope: "NON_PPKS"} as const;
  const ppksAggregate = {ownership: "ANY", dataScope: "PPKS_AGGREGATE"} as const;

  grant(matrix, "ADMIN", "POST", ["VIEW", "CREATE", "UPDATE", "DELETE", "PUBLISH", "SCHEDULE"], any);
  grant(matrix, "ADMIN", "MEDIA", ["VIEW", "CREATE", "UPDATE", "DELETE", "DOWNLOAD"], any);
  grant(matrix, "ADMIN", "CMS", ["VIEW", "CREATE", "UPDATE", "DELETE", "PUBLISH", "SCHEDULE"], any);
  grant(matrix, "ADMIN", "USER", ["VIEW", "CREATE", "UPDATE", "DELETE", "CHANGE_ROLE", "CHANGE_PASSWORD"], any);
  grant(matrix, "ADMIN", "BOOKING", ["VIEW", "CREATE", "UPDATE", "DELETE", "ASSIGN", "EXPORT", "DOWNLOAD", "APPROVE"], any);
  grant(matrix, "ADMIN", "TICKET", ["VIEW", "UPDATE", "ASSIGN", "EXPORT", "DOWNLOAD", "REPLY"], nonPpks);
  grant(matrix, "ADMIN", "PPKS_AGGREGATE", ["VIEW"], ppksAggregate);
  grant(matrix, "ADMIN", "AUDIT_LOG", ["VIEW", "EXPORT"], any);

  grant(matrix, "EDITOR", "POST", ["VIEW", "CREATE", "UPDATE", "DELETE", "PUBLISH", "SCHEDULE"], own);
  grant(matrix, "EDITOR", "MEDIA", ["VIEW", "CREATE", "UPDATE", "DELETE", "DOWNLOAD"], own);
  grant(matrix, "EDITOR", "USER", ["CHANGE_PASSWORD"], own);

  grant(matrix, "PETUGAS", "BOOKING", ["VIEW", "CREATE", "UPDATE", "DELETE", "ASSIGN", "EXPORT", "DOWNLOAD", "APPROVE"], any);
  grant(matrix, "PETUGAS", "TICKET", ["VIEW", "UPDATE", "ASSIGN", "EXPORT", "DOWNLOAD", "REPLY"], nonPpks);
  grant(matrix, "PETUGAS", "PPKS_AGGREGATE", ["VIEW"], ppksAggregate);
  grant(matrix, "PETUGAS", "USER", ["CHANGE_PASSWORD"], own);

  grant(matrix, "SATGAS_PPKS", "PPKS_AGGREGATE", ["VIEW"], ppksAggregate);
  grant(matrix, "SATGAS_PPKS", "PPKS_TICKET", ["VIEW", "UPDATE", "ASSIGN", "EXPORT", "DOWNLOAD", "REPLY"], {
    ownership: "ANY",
    dataScope: "PPKS_DETAIL",
  });
  grant(matrix, "SATGAS_PPKS", "PPKS_ACCESS_LOG", ["VIEW"], {
    ownership: "ANY",
    dataScope: "PPKS_ACCESS_LOG",
  });
  grant(matrix, "SATGAS_PPKS", "USER", ["CHANGE_PASSWORD"], own);

  return matrix;
}

export const PERMISSION_MATRIX = buildPermissionMatrix();

export function getPermissionRule(
  role: AuthRole,
  action: AuthAction,
  resource: AuthResource,
): PermissionRule {
  return PERMISSION_MATRIX[role][resource][action];
}

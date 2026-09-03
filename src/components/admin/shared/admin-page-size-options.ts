export const ADMIN_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export type AdminPageSize = (typeof ADMIN_PAGE_SIZE_OPTIONS)[number];

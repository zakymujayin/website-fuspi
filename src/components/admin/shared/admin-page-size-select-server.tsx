import {
  AdminPageSizeSelectClient,
} from "./admin-page-size-select";
import {
  ADMIN_PAGE_SIZE_OPTIONS,
  type AdminPageSize,
} from "./admin-page-size-options";

export { ADMIN_PAGE_SIZE_OPTIONS } from "./admin-page-size-options";

type AdminPageSizeSelectProps = {
  value: AdminPageSize;
  buildHref: (size: AdminPageSize) => string;
  label: string;
  optionLabel: (size: AdminPageSize) => string;
};

export function AdminPageSizeSelect({ value, buildHref, label, optionLabel }: AdminPageSizeSelectProps) {
  return (
    <AdminPageSizeSelectClient
      value={value}
      href={buildHref(value)}
      label={label}
      optionLabels={ADMIN_PAGE_SIZE_OPTIONS.map(optionLabel)}
    />
  );
}

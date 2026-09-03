import { AdminListSearchClient } from "./admin-list-search";

type AdminListSearchProps = {
  initialSearch: string;
  maxLength: number;
  buildHref: (search: string) => string;
  labels: { placeholder: string; ariaLabel: string; action: string; clear: string };
};

export function AdminListSearch({ initialSearch, maxLength, buildHref, labels }: AdminListSearchProps) {
  return (
    <AdminListSearchClient
      initialSearch={initialSearch}
      maxLength={maxLength}
      href={buildHref("")}
      labels={labels}
    />
  );
}

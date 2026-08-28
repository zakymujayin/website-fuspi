"use client";

import { useTranslations } from "next-intl";

import { AdminListSearch } from "@/components/admin/shared/admin-list-search";

import { buildAdminPageHref, ADMIN_PAGE_SEARCH_MAX_LENGTH, type AdminPageSort, type AdminPageStatusFilter } from "./page-query";

type AdminPageSearchProps = {
  initialSearch: string;
  status: AdminPageStatusFilter;
  sort: AdminPageSort;
  pageSize?: 10 | 20 | 50;
};

export function AdminPageSearch({ initialSearch, status, sort, pageSize }: AdminPageSearchProps) {
  const t = useTranslations("AdminPageList");

  return (
    <AdminListSearch
      initialSearch={initialSearch}
      maxLength={ADMIN_PAGE_SEARCH_MAX_LENGTH}
      buildHref={(search) => buildAdminPageHref({ status, sort, search, page: 1, pageSize })}
      labels={{
        placeholder: t("searchPlaceholder"),
        ariaLabel: t("searchAriaLabel"),
        action: t("searchAction"),
        clear: t("searchClear"),
      }}
    />
  );
}

"use client";

import { useTranslations } from "next-intl";

import { AdminListSearch } from "@/components/admin/shared/admin-list-search";

import { buildAdminPageHref, ADMIN_PAGE_SEARCH_MAX_LENGTH, type AdminPageSort, type AdminPageStatusFilter } from "./page-query";

type AdminPageSearchProps = {
  initialSearch: string;
  status: AdminPageStatusFilter;
  sort: AdminPageSort;
};

export function AdminPageSearch({ initialSearch, status, sort }: AdminPageSearchProps) {
  const t = useTranslations("AdminPageList");

  return (
    <AdminListSearch
      initialSearch={initialSearch}
      maxLength={ADMIN_PAGE_SEARCH_MAX_LENGTH}
      buildHref={(search) => buildAdminPageHref({ status, sort, search, page: 1 })}
      labels={{
        placeholder: t("searchPlaceholder"),
        ariaLabel: t("searchAriaLabel"),
        action: t("searchAction"),
        clear: t("searchClear"),
      }}
    />
  );
}

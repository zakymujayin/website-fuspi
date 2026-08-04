"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { buildAdminPageHref, ADMIN_PAGE_SEARCH_MAX_LENGTH, type AdminPageSort, type AdminPageStatusFilter } from "./page-query";

type AdminPageSearchProps = {
  initialSearch: string;
  status: AdminPageStatusFilter;
  sort: AdminPageSort;
};

export function AdminPageSearch({ initialSearch, status, sort }: AdminPageSearchProps) {
  const t = useTranslations("AdminPageList");
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildAdminPageHref({ status, sort, search: search.trim(), page: 1 }));
  }

  function clear() {
    setSearch("");
    if (initialSearch) {
      router.push(buildAdminPageHref({ status, sort, search: "", page: 1 }));
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-wrap items-center gap-2" role="search">
      <div className="relative flex-1">
        <SearchIcon
          aria-hidden
          className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          strokeWidth={1.5}
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          maxLength={ADMIN_PAGE_SEARCH_MAX_LENGTH}
          placeholder={t("searchPlaceholder")}
          className="ps-9"
          aria-label={t("searchAriaLabel")}
        />
      </div>
      <Button type="submit" variant="outline">
        {t("searchAction")}
      </Button>
      {search || initialSearch ? (
        <Button type="button" variant="ghost" onClick={clear}>
          <XIcon data-icon aria-hidden />
          {t("searchClear")}
        </Button>
      ) : null}
    </form>
  );
}

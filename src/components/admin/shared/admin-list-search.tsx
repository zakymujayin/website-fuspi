"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminListSearchProps = {
  initialSearch: string;
  maxLength: number;
  href: string;
  labels: { placeholder: string; ariaLabel: string; action: string; clear: string };
};

function withSearch(href: string, search: string): string {
  const [pathname, query = ""] = href.split("?", 2);
  const params = new URLSearchParams(query);

  if (search) params.set("search", search);
  else params.delete("search");
  params.delete("page");

  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function AdminListSearchClient({ initialSearch, maxLength, href, labels }: AdminListSearchProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(withSearch(href, search.trim()));
  }

  function clear() {
    setSearch("");
    if (initialSearch) router.push(withSearch(href, ""));
  }

  return (
    <form onSubmit={submit} role="search" className="flex w-full max-w-md flex-wrap items-center gap-2">
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
          maxLength={maxLength}
          placeholder={labels.placeholder}
          aria-label={labels.ariaLabel}
          className="ps-9"
        />
      </div>
      <Button type="submit" variant="outline">
        {labels.action}
      </Button>
      {search || initialSearch ? (
        <Button type="button" variant="ghost" onClick={clear}>
          <XIcon data-icon aria-hidden />
          {labels.clear}
        </Button>
      ) : null}
    </form>
  );
}

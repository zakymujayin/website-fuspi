"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useRouter } from "@/i18n/navigation";

/**
 * Toggle-to-reveal search field. No content-search endpoint exists yet (the
 * public post query layer only filters by category/tag), so submission lands
 * on the news hub rather than filtered results — a real query param wiring
 * is a backend/contract follow-up, not a frontend concern.
 */
export function HeaderSearch() {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("q");
    if (typeof query === "string" && query.trim().length > 0) {
      router.push(`/berita?q=${encodeURIComponent(query.trim())}`);
    }
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex shrink-0 items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? t("closeSearch") : t("openSearch")}
        className="grid size-11 shrink-0 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-royal-600"
      >
        {open ? (
          <X aria-hidden className="size-5" strokeWidth={1.5} />
        ) : (
          <Search aria-hidden className="size-5" strokeWidth={1.5} />
        )}
      </button>

      {open ? (
        <form
          onSubmit={handleSubmit}
          role="search"
          className="absolute top-full end-0 z-40 mt-2 flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <input
            ref={inputRef}
            type="search"
            name="q"
            placeholder={t("searchPlaceholder")}
            className="h-11 w-56 bg-transparent px-3 text-sm text-slate-700 outline-none sm:w-72"
          />
          <button
            type="submit"
            aria-label={t("searchSubmit")}
            className="grid h-11 w-11 shrink-0 place-items-center text-royal-600 transition-colors hover:bg-royal-50"
          >
            <Search aria-hidden className="size-4" strokeWidth={1.5} />
          </button>
        </form>
      ) : null}
    </div>
  );
}

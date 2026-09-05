"use client";

import {ArrowRight, Search, X} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useEffect, useId, useRef, useState} from "react";
import {z} from "zod";

import {Button} from "@/components/ui/button";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger} from "@/components/ui/sheet";
import {Skeleton} from "@/components/ui/skeleton";
import {Link} from "@/i18n/navigation";
import styles from "../home-design.module.css";

// Only resources with unambiguous existing detail routes. POST omits subtype.
const destinations = {
  STUDY_PROGRAM: "/prodi",
  LECTURER: "/dosen",
  DOCUMENT: "/dokumen",
  EVENT: "/agenda",
  SERVICE: "/layanan",
  PARTNERSHIP: "/kerjasama",
} as const;
const resourceSchema = z.enum(["STUDY_PROGRAM", "LECTURER", "DOCUMENT", "EVENT", "SERVICE", "PARTNERSHIP"]);
type Resource = z.infer<typeof resourceSchema>;
const responseSchema = z.object({
  ok: z.literal(true),
  items: z.array(z.object({
    type: resourceSchema,
    id: z.string().min(1),
    title: z.string().min(1).max(500),
    excerpt: z.string().max(200),
    slug: z.string().min(1).max(191).refine(value => value !== "." && value !== ".." && !/[\\/\\\\]/.test(value)),
  })).max(10),
  page: z.object({
    page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});
type Results = z.infer<typeof responseSchema>;

export function HeaderSearch() {
  const t = useTranslations("Nav");
  const s = useTranslations("SiteSearch");
  const locale = useLocale();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [resource, setResource] = useState<Resource>("STUDY_PROGRAM");
  const [results, setResults] = useState<Results | null>(null);
  const [submitted, setSubmitted] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const requestRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  function changeOpen(value: boolean) {
    setOpen(value);
    if (!value) {
      requestRef.current?.abort();
      setState("idle");
      setResults(null);
    }
  }

  async function search(page = 1, term = submitted) {
    term = term.trim();
    if (!term) {inputRef.current?.focus(); return;}
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState("loading");
    setSubmitted(term);
    setResults(null);
    const timeout = window.setTimeout(() => controller.abort("timeout"), 15000);
    try {
      const parameters = new URLSearchParams({q: term, locale, resourceTypes: resource, page: String(page), pageSize: "10"});
      const response = await fetch(`/api/public/search?${parameters}`, {signal: controller.signal});
      if (!response.ok) throw new Error("unavailable");
      const parsed = responseSchema.safeParse(await response.json());
      if (!parsed.success || parsed.data.items.some(item => item.type !== resource)) throw new Error("unavailable");
      if (controller.signal.aborted) return;
      setResults(parsed.data);
      setState("ready");
      if (page > 1) requestAnimationFrame(() => statusRef.current?.focus());
    } catch {
      if (!controller.signal.aborted || controller.signal.reason === "timeout") setState("error");
    } finally {
      window.clearTimeout(timeout);
    }
  }

  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetTrigger aria-label={t("openSearch")} className="grid size-11 shrink-0 place-items-center rounded-md text-royal-800 transition-colors hover:bg-royal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-700">
        <Search aria-hidden className="size-5" strokeWidth={1.75} />
      </SheetTrigger>
      <SheetContent side="top" showCloseButton={false} initialFocus={inputRef} className={styles.searchPanel} dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle>{s("title")}</SheetTitle>
              <SheetDescription>{s("description")}</SheetDescription>
            </div>
            <SheetClose render={<Button variant="ghost" size="icon" className="size-11 shrink-0" />} aria-label={t("closeSearch")}><X data-icon /></SheetClose>
          </div>
          <form role="search" aria-label={s("title")} onSubmit={event => {event.preventDefault(); void search(1, query);}} className="mt-6">
            <FieldGroup className="gap-4">
              <div className="grid items-end gap-3 sm:grid-cols-[1fr_14rem]">
                <Field>
                  <FieldLabel htmlFor={`${id}-query`}>{t("searchSubmit")}</FieldLabel>
                  <Input ref={inputRef} id={`${id}-query`} name="q" type="search" value={query} onChange={event => setQuery(event.target.value)} maxLength={200} required placeholder={t("searchPlaceholder")} className="h-12" />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-resource`}>{s("scope")}</FieldLabel>
                  <select id={`${id}-resource`} value={resource} onChange={event => {
                    requestRef.current?.abort();
                    setResource(resourceSchema.parse(event.target.value));
                    setResults(null);
                    setState("idle");
                  }} className="h-12 w-full rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    {Object.keys(destinations).map(key => <option key={key} value={key}>{s(`resource.${key}`)}</option>)}
                  </select>
                </Field>
              </div>
              <Button type="submit" className="h-11 self-start" aria-busy={state === "loading"}><Search data-icon="inline-start" />{t("searchSubmit")}</Button>
            </FieldGroup>
          </form>
          <div className="mt-5 border-t border-slate-300 pt-4" aria-busy={state === "loading"}>
            <p ref={statusRef} tabIndex={-1} role="status" className="text-sm leading-6 text-slate-700 outline-none">
              {state === "idle" ? s("hint") : state === "loading" ? s("loading") : state === "error" ? s("error") : results?.items.length ? s("count", {count: results.page.total}) : s("empty")}
            </p>
            {state === "loading" ? <div aria-hidden className="mt-4 flex flex-col gap-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-5 w-1/2" /></div> : null}
            {results ? <>
              <ul className="mt-2 max-h-[42svh] overflow-y-auto overscroll-contain">
                {results.items.map(item => <li key={item.id} className="border-b border-slate-200">
                  <Link href={`${destinations[item.type]}/${encodeURIComponent(item.slug)}`} onClick={() => changeOpen(false)} className="group flex min-h-14 items-center justify-between gap-4 px-1 py-4 text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-royal-700">
                    <span><span className="block text-lg font-semibold underline decoration-slate-300 underline-offset-4 group-hover:decoration-royal-700">{item.title}</span>{item.excerpt ? <span className="mt-1 block text-sm leading-6 text-slate-700">{item.excerpt}</span> : null}</span>
                    <ArrowRight aria-hidden className="size-5 shrink-0 rtl:rotate-180" />
                  </Link>
                </li>)}
              </ul>
              {results.page.totalPages > 1 ? <nav aria-label={s("pages")} className="mt-4 flex items-center justify-between gap-3">
                <Button variant="outline" className="h-11" disabled={!results.page.hasPreviousPage} onClick={() => void search(results.page.page - 1)}>{s("previous")}</Button>
                <span className="text-sm tabular-nums">{results.page.page} / {results.page.totalPages}</span>
                <Button variant="outline" className="h-11" disabled={!results.page.hasNextPage} onClick={() => void search(results.page.page + 1)}>{s("next")}</Button>
              </nav> : null}
            </> : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

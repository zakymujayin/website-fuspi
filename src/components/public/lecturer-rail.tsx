"use client";

import {ChevronLeft, ChevronRight} from "lucide-react";
import {useTranslations} from "next-intl";
import {useCallback, useEffect, useRef, useState} from "react";

import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {Link} from "@/i18n/navigation";
import styles from "./home-design.module.css";

const AUTOPLAY_MS = 7000;

export type LecturerRailItem = {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  program: string | null;
  photoUrl: string | null;
  photoAlt: string | null;
};

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter((part) => !part.includes("."))
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

/**
 * Navigable lecturer rail: roughly three profiles on desktop, two on tablet and
 * one-and-a-bit on mobile so the swipe affordance is visible. Native scroll
 * snapping does the dragging, so no gesture dependency is needed; the arrows,
 * pagination and arrow keys drive the same scroll position.
 *
 * Autoplay is opt-out by construction: it never starts under reduced motion and
 * stops for good the moment a visitor navigates by hand.
 */
export function LecturerRail({items}: {items: readonly LecturerRailItem[]}) {
  const t = useTranslations("Home");
  const railRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [autoplay, setAutoplay] = useState(false);
  const [paused, setPaused] = useState(false);

  const metrics = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return null;
    const cards = Array.from(rail.children) as HTMLElement[];
    const first = cards[0];
    if (!first) return null;
    const gap = Number.parseFloat(getComputedStyle(rail).columnGap) || 0;
    const perView = Math.max(1, Math.round((rail.clientWidth + gap) / (first.offsetWidth + gap)));
    return {rail, cards, perView, rtl: getComputedStyle(rail).direction === "rtl"};
  }, []);

  // Page count follows the layout, so a resize across a breakpoint re-pages.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const current = metrics();
      if (!current) return;
      setPageCount(Math.max(1, Math.ceil(items.length / current.perView)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [items.length, metrics]);

  // Keep the indicator honest when the visitor swipes or tabs through cards.
  // Measured from the leading card of each page rather than from a computed
  // offset, so scroll padding and snapping cannot desynchronise it.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const current = metrics();
        if (!current) return;
        const bounds = current.rail.getBoundingClientRect();
        let closest = 0;
        let smallest = Number.POSITIVE_INFINITY;
        for (let index = 0; index < current.cards.length; index += current.perView) {
          const card = current.cards[index].getBoundingClientRect();
          const distance = Math.abs(current.rtl ? bounds.right - card.right : card.left - bounds.left);
          if (distance < smallest) {
            smallest = distance;
            closest = index / current.perView;
          }
        }
        setPage(closest);
      });
    };
    rail.addEventListener("scroll", onScroll, {passive: true});
    return () => {
      cancelAnimationFrame(frame);
      rail.removeEventListener("scroll", onScroll);
    };
  }, [metrics]);

  const goTo = useCallback((next: number) => {
    const current = metrics();
    if (!current) return;
    const total = Math.max(1, Math.ceil(items.length / current.perView));
    const target = ((next % total) + total) % total;
    const leading = current.cards[target * current.perView];
    if (!leading) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    // `block: "nearest"` keeps the page itself still; the browser resolves the
    // snap position, writing direction and scroll padding for us.
    leading.scrollIntoView({behavior: reduced ? "auto" : "smooth", inline: "start", block: "nearest"});
    setPage(target);
  }, [items.length, metrics]);

  const takeControl = useCallback((next: number) => {
    setAutoplay(false);
    goTo(next);
  }, [goTo]);

  // Autoplay only ever arms itself when motion is welcome.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAutoplay(!preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const playing = autoplay && !paused && pageCount > 1;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => goTo(page + 1), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [playing, page, goTo]);

  if (items.length === 0) return null;

  return (
    <div
      data-autoplay={playing ? "playing" : "paused"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div
        ref={railRef}
        role="group"
        aria-roledescription="carousel"
        aria-label={t("lecturersTitle")}
        className={styles.rail}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          if (!(event.target as HTMLElement).closest("a")) return;
          event.preventDefault();
          const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
          const forward = rtl ? event.key === "ArrowLeft" : event.key === "ArrowRight";
          takeControl(page + (forward ? 1 : -1));
        }}
      >
        {items.map((lecturer) => (
          <div key={lecturer.id} className={styles.railItem}>
            <Link href={`/dosen/${lecturer.slug}`} className={`${styles.lecturerCard} group`}>
              <div className={styles.lecturerPortrait}>
                {lecturer.photoUrl ? (
                  <ImageWithFallback
                    src={lecturer.photoUrl}
                    alt={lecturer.photoAlt ?? lecturer.name}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 78vw"
                  />
                ) : (
                  <span aria-hidden className="grid size-full place-items-center text-4xl font-semibold text-royal-800">
                    {initialsOf(lecturer.name)}
                  </span>
                )}
              </div>
              <span className={styles.lecturerName} title={lecturer.name}>{lecturer.name}</span>
              {lecturer.role ? <span className={styles.lecturerRole}>{lecturer.role}</span> : null}
              {lecturer.program ? <span className={styles.lecturerProgram}>{lecturer.program}</span> : null}
            </Link>
          </div>
        ))}
      </div>

      {pageCount > 1 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className={styles.railProgress}>
            {Array.from({length: pageCount}, (_, dot) => (
              <button
                key={dot}
                type="button"
                className={styles.railDotButton}
                aria-label={t("lecturersPage", {page: dot + 1})}
                aria-current={dot === page}
                onClick={() => takeControl(dot)}
              >
                <span aria-hidden className={styles.railDot} data-active={dot === page} />
              </button>
            ))}
          </div>
          <div className={styles.railControls}>
            <p aria-live="polite" className="sr-only">{t("lecturersStatus", {page: page + 1, total: pageCount})}</p>
            <button type="button" className={styles.railButton} aria-label={t("lecturersPrevious")} onClick={() => takeControl(page - 1)}>
              <ChevronLeft aria-hidden className="size-5 rtl:rotate-180" strokeWidth={1.75} />
            </button>
            <button type="button" className={styles.railButton} aria-label={t("lecturersNext")} onClick={() => takeControl(page + 1)}>
              <ChevronRight aria-hidden className="size-5 rtl:rotate-180" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

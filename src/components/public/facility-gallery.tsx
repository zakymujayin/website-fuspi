"use client";

import {ChevronLeft, ChevronRight, Maximize2, X} from "lucide-react";
import {useTranslations} from "next-intl";
import {useCallback, useEffect, useRef, useState} from "react";

import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {Reveal} from "@/components/public/reveal";
import {Link} from "@/i18n/navigation";
import {cn} from "@/lib/utils";
import styles from "./home-design.module.css";

export type FacilityGalleryItem = {
  id: string;
  caption: string;
  url: string | null;
  alt: string;
  focalPoint: {x: number; y: number} | null;
};

const SWIPE_THRESHOLD = 45;

/**
 * The approved facility mosaic plus a lightbox.
 *
 * The overlay renders no <img> until it is opened, so it costs nothing at page
 * load, and it then reuses the original the mosaic already fetched rather than
 * requesting a second asset. The overlay is a real <dialog> opened with
 * showModal(), so focus trapping, Escape and background inertness come from the
 * platform rather than from hand-rolled key handling. Without JavaScript each
 * tile still resolves to the facilities page, so no control is ever dead.
 */
export function FacilityGallery({
  items,
  bento,
  href,
}: {
  items: readonly FacilityGalleryItem[];
  bento: boolean;
  href: string;
}) {
  const t = useTranslations("Home");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggers = useRef<Array<HTMLAnchorElement | null>>([]);
  const touchStart = useRef<number | null>(null);
  const restoreTo = useRef<number>(0);
  const [active, setActive] = useState<number | null>(null);

  const lockScroll = useCallback((locked: boolean) => {
    const body = document.body;
    if (locked) {
      // Compensate for the removed scrollbar so nothing on the page shifts.
      const gutter = window.innerWidth - document.documentElement.clientWidth;
      body.dataset.lightboxLock = "true";
      body.style.overflow = "hidden";
      if (gutter > 0) body.style.paddingInlineEnd = `${gutter}px`;
    } else if (body.dataset.lightboxLock) {
      delete body.dataset.lightboxLock;
      body.style.overflow = "";
      body.style.paddingInlineEnd = "";
    }
  }, []);

  const openAt = useCallback((index: number) => {
    restoreTo.current = index;
    setActive(index);
  }, []);

  // Opened from an effect so the dialog already contains its controls when the
  // browser moves focus into it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || active === null || dialog.open) return;
    lockScroll(true);
    dialog.showModal();
  }, [active, lockScroll]);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const step = useCallback((delta: number) => {
    setActive((current) => {
      if (current === null) return current;
      return (current + delta + items.length) % items.length;
    });
  }, [items.length]);

  // Escape and the backdrop both route through the dialog's own close event, so
  // unlocking and focus restoration happen in exactly one place.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      setActive(null);
      lockScroll(false);
      triggers.current[restoreTo.current]?.focus();
    };
    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("close", onClose);
      lockScroll(false);
    };
  }, [lockScroll]);

  const current = active === null ? null : items[active];

  return (
    <>
      <div
        className={cn(
          "grid grid-flow-dense overflow-hidden rounded-md bg-slate-300",
          bento ? "grid-cols-2 grid-rows-4 gap-px md:grid-cols-4 md:grid-rows-2" : "gap-px sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {items.map((facility, index) => (
          <Reveal
            key={facility.id}
            variant="image"
            index={index}
            className={cn(
              bento && index === 0 ? "col-span-2 row-span-2 min-h-80 md:min-h-[32rem]" : bento ? "min-h-48 md:min-h-0" : "aspect-[4/3]",
            )}
          >
            <figure className={styles.facilityTile}>
              <ImageWithFallback
                src={facility.url}
                alt={facility.alt}
                className="object-cover"
                sizes={index === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                focalPoint={facility.focalPoint}
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-transparent to-transparent" />
              <h3 className={cn(styles.facilityCaption, index === 0 && bento ? "text-2xl md:p-6 md:text-3xl" : "text-lg")}>
                {facility.caption}
              </h3>
              <Link
                ref={(node) => {triggers.current[index] = node;}}
                href={href}
                className={styles.facilityOpen}
                aria-label={`${t("galleryOpen")}: ${facility.caption}`}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  openAt(index);
                }}
              >
                <span aria-hidden className={styles.facilityCue}>
                  <Maximize2 className="size-5" strokeWidth={1.75} />
                </span>
              </Link>
            </figure>
          </Reveal>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className={styles.lightbox}
        aria-label={t("galleryDialog")}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
          const forward = rtl ? event.key === "ArrowLeft" : event.key === "ArrowRight";
          step(forward ? 1 : -1);
        }}
      >
        {current ? (
          <div className={styles.lightboxShell}>
            <div className={styles.lightboxBar}>
              <p className={styles.lightboxCount}>{t("galleryPosition", {current: (active ?? 0) + 1, total: items.length})}</p>
              <button type="button" className={styles.lightboxButton} aria-label={t("galleryClose")} onClick={close}>
                <X aria-hidden className="size-5" strokeWidth={1.75} />
              </button>
            </div>

            <div
              className={styles.lightboxStage}
              onClick={(event) => {if (event.target === event.currentTarget) close();}}
              onTouchStart={(event) => {touchStart.current = event.touches[0]?.clientX ?? null;}}
              onTouchEnd={(event) => {
                const start = touchStart.current;
                touchStart.current = null;
                if (start === null || items.length < 2) return;
                const delta = (event.changedTouches[0]?.clientX ?? start) - start;
                if (Math.abs(delta) < SWIPE_THRESHOLD) return;
                const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
                const forward = rtl ? delta > 0 : delta < 0;
                step(forward ? 1 : -1);
              }}
            >
              {current.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- uploads are served unoptimized; the lightbox needs the original at its intrinsic ratio.
                <img
                  key={current.id}
                  src={current.url}
                  alt={current.alt}
                  className={styles.lightboxImage}
                  decoding="async"
                />
              ) : null}
            </div>

            <div className={styles.lightboxFooter}>
              <p className={styles.lightboxTitle}>{current.caption}</p>
              {items.length > 1 ? (
                <div className={styles.lightboxNav}>
                  <button type="button" className={styles.lightboxButton} aria-label={t("galleryPrevious")} onClick={() => step(-1)}>
                    <ChevronLeft aria-hidden className="size-5 rtl:rotate-180" strokeWidth={1.75} />
                  </button>
                  <button type="button" className={styles.lightboxButton} aria-label={t("galleryNext")} onClick={() => step(1)}>
                    <ChevronRight aria-hidden className="size-5 rtl:rotate-180" strokeWidth={1.75} />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

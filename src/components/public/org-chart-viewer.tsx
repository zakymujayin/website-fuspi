"use client";

import { Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Zoom/pan viewer for a single high-resolution diagram.
 *
 * The org chart is supplied as an image rather than rendered from data, so the
 * only way to read the small boxes is to magnify them. Scale 1 means "fitted
 * inside the frame"; everything above that is genuine magnification of the
 * source file, which is why the image is served straight from `public/` and
 * never through the 1600px media pipeline.
 */

const MIN_SCALE = 1;
const MAX_SCALE = 6;
/** One press of a zoom button, and one step of a double-click. */
const STEP = 1.5;
/** One arrow-key press, in frame pixels. */
const PAN_STEP = 56;

type Offset = { x: number; y: number };
type Point = { x: number; y: number };

const ORIGIN: Offset = { x: 0, y: 0 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const subscribeFullscreen = (onChange: () => void) => {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
};

/** Fullscreen *support* never changes for the life of the document. */
const subscribeNothing = () => () => {};
const isFullscreen = () => document.fullscreenElement !== null;
const fullscreenSupported = () => document.fullscreenEnabled === true;
const notOnTheServer = () => false;

export function OrgChartViewer({ src, alt }: { src: string; alt: string }) {
  const t = useTranslations("OrgChart");
  const frameRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  /** Live pointers on the frame; two of them mean a pinch, one means a drag. */
  const pointers = useRef(new Map<number, Point>());
  const dragStart = useRef<{ pointer: Point; offset: Offset } | null>(null);
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);

  const [scale, setScale] = useState(MIN_SCALE);
  const [offset, setOffset] = useState<Offset>(ORIGIN);
  const [dragging, setDragging] = useState(false);

  // Read through the platform rather than mirrored into state: the browser
  // owns fullscreen, and the user can leave it with Esc without telling us.
  const fullscreen = useSyncExternalStore(subscribeFullscreen, isFullscreen, notOnTheServer);
  const canFullscreen = useSyncExternalStore(
    subscribeNothing,
    fullscreenSupported,
    notOnTheServer,
  );

  const zoomed = scale > MIN_SCALE;

  /**
   * Keeps the diagram from being dragged out of view: the image may travel at
   * most half of its overflow in each direction. `offsetWidth` is the laid-out
   * size, which `transform` never changes, so it stays a stable base.
   */
  const clampOffset = useCallback((next: Offset, nextScale: number): Offset => {
    const frame = frameRef.current;
    const image = imageRef.current;
    if (!frame || !image) return next;

    const maxX = Math.max(0, (image.offsetWidth * nextScale - frame.clientWidth) / 2);
    const maxY = Math.max(0, (image.offsetHeight * nextScale - frame.clientHeight) / 2);

    return { x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
  }, []);

  /**
   * Zooms towards `anchor` (a client point) so the spot under the cursor or
   * between two fingers stays put. Without an anchor it zooms about the centre.
   */
  const zoomTo = useCallback(
    (requested: number, anchor?: Point) => {
      const next = clamp(requested, MIN_SCALE, MAX_SCALE);
      if (next === scale) return;

      const frame = frameRef.current;
      let anchorX = 0;
      let anchorY = 0;
      if (frame && anchor) {
        const rect = frame.getBoundingClientRect();
        anchorX = anchor.x - rect.left - rect.width / 2;
        anchorY = anchor.y - rect.top - rect.height / 2;
      }

      const ratio = next / scale;
      setScale(next);
      setOffset(
        clampOffset(
          {
            x: anchorX - ratio * (anchorX - offset.x),
            y: anchorY - ratio * (anchorY - offset.y),
          },
          next,
        ),
      );
    },
    [clampOffset, offset, scale],
  );

  const reset = useCallback(() => {
    setScale(MIN_SCALE);
    setOffset(ORIGIN);
  }, []);

  // Wheel zoom is deliberately gated behind Ctrl/Cmd (which is also what a
  // trackpad pinch reports) so an ordinary scroll still scrolls the page
  // instead of being swallowed by the diagram.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomTo(scale * (event.deltaY < 0 ? 1.12 : 1 / 1.12), {
        x: event.clientX,
        y: event.clientY,
      });
    };

    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [scale, zoomTo]);

  // Entering or leaving fullscreen, rotating a phone, or resizing the window
  // all change the frame, which can leave the image parked outside its new
  // bounds.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const observer = new ResizeObserver(() => {
      setOffset((current) => clampOffset(current, scale));
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [clampOffset, scale]);

  const toggleFullscreen = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frame.requestFullscreen();
  }, []);

  function endPointer(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) {
      dragStart.current = null;
      setDragging(false);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  /**
   * The controls sit inside the frame so they follow it into fullscreen, which
   * means their pointer events bubble here. Capturing one would retarget the
   * click away from the button and the press would never register.
   */
  function fromControls(target: EventTarget | null) {
    return target instanceof Element && target.closest("[data-chart-controls]") !== null;
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (fromControls(event.target)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      if (first && second) {
        pinchStart.current = {
          distance: Math.hypot(first.x - second.x, first.y - second.y),
          scale,
        };
      }
      dragStart.current = null;
      setDragging(false);
      return;
    }

    // Nothing to pan while the whole diagram is already visible.
    if (!zoomed) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { pointer: { x: event.clientX, y: event.clientY }, offset };
    setDragging(true);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const pinch = pinchStart.current;
    if (pinch && pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      if (!first || !second || pinch.distance <= 0) return;
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      zoomTo(pinch.scale * (distance / pinch.distance), {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      });
      return;
    }

    const start = dragStart.current;
    if (!start) return;
    setOffset(
      clampOffset(
        {
          x: start.offset.x + (event.clientX - start.pointer.x),
          y: start.offset.y + (event.clientY - start.pointer.y),
        },
        scale,
      ),
    );
  }

  function onDoubleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (fromControls(event.target)) return;
    if (scale >= MAX_SCALE) {
      reset();
      return;
    }
    zoomTo(scale * STEP, { x: event.clientX, y: event.clientY });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const pan = (dx: number, dy: number) =>
      setOffset((current) => clampOffset({ x: current.x + dx, y: current.y + dy }, scale));

    switch (event.key) {
      case "+":
      case "=":
        zoomTo(scale * STEP);
        break;
      case "-":
      case "_":
        zoomTo(scale / STEP);
        break;
      case "0":
        reset();
        break;
      case "ArrowLeft":
        pan(PAN_STEP, 0);
        break;
      case "ArrowRight":
        pan(-PAN_STEP, 0);
        break;
      case "ArrowUp":
        pan(0, PAN_STEP);
        break;
      case "ArrowDown":
        pan(0, -PAN_STEP);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <figure className="flex flex-col gap-3">
      <div
        ref={frameRef}
        role="group"
        aria-label={t("label")}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 outline-none",
          "h-[min(72vh,820px)] min-h-96 focus-visible:ring-3 focus-visible:ring-royal-500/40",
          "lg:h-[min(78vh,900px)]",
          // In fullscreen the frame is the viewport, so the fixed height must go.
          "[&:fullscreen]:h-screen [&:fullscreen]:rounded-none [&:fullscreen]:bg-white",
          zoomed ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in",
        )}
        // Panning only claims the gesture once there is something to pan;
        // until then a touch drag scrolls the page as usual.
        style={{ touchAction: zoomed ? "none" : "pan-y" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- the diagram is
            served at full resolution from /public on purpose; the optimizer
            would re-encode it and defeat zooming. */}
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          draggable={false}
          decoding="async"
          onLoad={reset}
          className={cn(
            "max-h-full max-w-full select-none object-contain",
            !dragging && "transition-transform duration-200 motion-reduce:transition-none",
          )}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          }}
        />

        <div
          data-chart-controls
          className="absolute bottom-3 end-3 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur-sm"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("zoomOut")}
            disabled={scale <= MIN_SCALE}
            onClick={() => zoomTo(scale / STEP)}
          >
            <ZoomOut aria-hidden />
          </Button>
          <span className="min-w-12 text-center text-xs font-medium tabular-nums text-slate-600">
            {Math.round(scale * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("zoomIn")}
            disabled={scale >= MAX_SCALE}
            onClick={() => zoomTo(scale * STEP)}
          >
            <ZoomIn aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("reset")}
            disabled={!zoomed && offset.x === 0 && offset.y === 0}
            onClick={reset}
          >
            <RotateCcw aria-hidden />
          </Button>
          {canFullscreen ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
              onClick={toggleFullscreen}
            >
              {fullscreen ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
            </Button>
          ) : null}
        </div>
      </div>

      <figcaption className="text-center text-xs text-slate-500">{t("hint")}</figcaption>
    </figure>
  );
}

"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  cropRectToPercent,
  fullCropRect,
  moveCropRect,
  resizeCropRect,
  type CropHandle,
  type CropRect,
} from "./image-crop-geometry";

const HANDLES: readonly CropHandle[] = ["nw", "ne", "sw", "se"];

/* Inline physical offsets on purpose: each handle sits at the geometric corner it
   resizes (nw = the x/y origin), and the raster it crops does not mirror in RTL.
   Tailwind's logical inset utilities would flip these under `dir="rtl"`. */
const HANDLE_STYLE: Record<CropHandle, CSSProperties> = {
  nw: { left: -6, top: -6, cursor: "nwse-resize" },
  ne: { right: -6, top: -6, cursor: "nesw-resize" },
  sw: { left: -6, bottom: -6, cursor: "nesw-resize" },
  se: { right: -6, bottom: -6, cursor: "nwse-resize" },
};

export type ImageCropLabels = {
  title: string;
  instructions: string;
  apply: string;
  reset: string;
  applied: string;
  error: string;
};

type ImageCropEditorProps = {
  /** The pristine file to crop from — never the already-cropped result. */
  file: File;
  isCropped: boolean;
  onApply: (cropped: File) => void;
  onReset: () => void;
  labels: ImageCropLabels;
};

type Drag = {
  kind: "move" | CropHandle;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startRect: CropRect;
};

/** Draw `rect` (natural pixels) of `file` onto a canvas and re-encode as WebP. */
export async function cropFileToWebp(file: File, rect: CropRect): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    ctx.drawImage(
      bitmap,
      Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height),
      0, 0, canvas.width, canvas.height,
    );
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
    if (!blob) throw new Error("encode failed");
    const stem = file.name.replace(/\.[^.]+$/u, "") || "media";
    return new File([blob], `${stem}.webp`, { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}

/**
 * Drag the selection box (or its corner handles) over the pristine file, then
 * bake that region into a new WebP on apply. Pure client work — no uploads here.
 */
export function ImageCropEditor({ file, isCropped, onApply, onReset, labels }: ImageCropEditorProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [rect, setRect] = useState<CropRect | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);

  // Paired create/revoke in one effect so StrictMode's remount recreates the URL it just revoked.
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- paired create/revoke, see above
    setUrl(objectUrl);
    setNatural(null);
    setRect(null);
    setFailed(false);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function naturalPerCssPixel() {
    const frame = frameRef.current;
    if (!frame || !natural) return 1;
    const width = frame.getBoundingClientRect().width;
    return width === 0 ? 1 : natural.w / width;
  }

  function onPointerDownBox(event: ReactPointerEvent<HTMLDivElement>) {
    if (!rect) return;
    event.preventDefault();
    dragRef.current = {
      kind: "move",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: rect,
    };
    frameRef.current?.setPointerCapture(event.pointerId);
  }

  function onPointerDownHandle(handle: CropHandle) {
    return (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!rect) return;
      event.preventDefault();
      event.stopPropagation();
      dragRef.current = {
        kind: handle,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startRect: rect,
      };
      frameRef.current?.setPointerCapture(event.pointerId);
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || !natural || drag.pointerId !== event.pointerId) return;
    const k = naturalPerCssPixel();
    const dx = (event.clientX - drag.startClientX) * k;
    const dy = (event.clientY - drag.startClientY) * k;
    setRect(
      drag.kind === "move"
        ? moveCropRect(drag.startRect, dx, dy, natural.w, natural.h)
        : resizeCropRect(drag.startRect, drag.kind, dx, dy, natural.w, natural.h),
    );
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    frameRef.current?.releasePointerCapture(event.pointerId);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!rect || !natural) return;
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-8, 0],
      ArrowRight: [8, 0],
      ArrowUp: [0, -8],
      ArrowDown: [0, 8],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    // Shift + arrow resizes from the bottom-right corner; plain arrow moves the box.
    setRect(
      event.shiftKey
        ? resizeCropRect(rect, "se", delta[0], delta[1], natural.w, natural.h)
        : moveCropRect(rect, delta[0], delta[1], natural.w, natural.h),
    );
  }

  async function apply() {
    if (!rect || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      onApply(await cropFileToWebp(file, rect));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const percent = rect && natural ? cropRectToPercent(rect, natural.w, natural.h) : null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-slate-700">{labels.title}</p>
      <div
        ref={frameRef}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative w-full touch-none overflow-hidden rounded-lg border border-slate-200 bg-slate-100 select-none"
      >
        {url ? (
          /* eslint-disable-next-line @next/next/no-img-element -- local blob preview for an in-panel
             crop control, not a page image; next/image does not reliably load blob: object URLs. */
          <img
            src={url}
            alt=""
            className="pointer-events-none block w-full"
            onLoad={(event) => {
              const el = event.currentTarget;
              setNatural({ w: el.naturalWidth, h: el.naturalHeight });
              setRect(fullCropRect(el.naturalWidth, el.naturalHeight));
            }}
          />
        ) : null}

        {percent ? (
          <div
            role="group"
            tabIndex={0}
            aria-label={labels.instructions}
            onPointerDown={onPointerDownBox}
            onKeyDown={onKeyDown}
            className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.55)] outline-none focus-visible:ring-2 focus-visible:ring-royal-500"
            style={{
              left: `${percent.left}%`,
              top: `${percent.top}%`,
              width: `${percent.width}%`,
              height: `${percent.height}%`,
            }}
          >
            {HANDLES.map((handle) => (
              <button
                key={handle}
                type="button"
                tabIndex={-1}
                aria-hidden
                onPointerDown={onPointerDownHandle(handle)}
                style={HANDLE_STYLE[handle]}
                className="absolute size-3 rounded-full border-2 border-royal-500 bg-white"
              />
            ))}
          </div>
        ) : null}
      </div>

      <p className="text-xs text-slate-500">{labels.instructions}</p>
      {failed ? <p role="alert" className="text-xs text-destructive">{labels.error}</p> : null}

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => void apply()} disabled={busy || !rect}>
          {busy ? <Spinner data-icon /> : null}
          {labels.apply}
        </Button>
        {isCropped ? (
          <Button type="button" size="sm" variant="ghost" onClick={onReset} disabled={busy}>
            {labels.reset}
          </Button>
        ) : null}
        {isCropped ? <span className="text-xs text-emerald-700">{labels.applied}</span> : null}
      </div>
    </div>
  );
}

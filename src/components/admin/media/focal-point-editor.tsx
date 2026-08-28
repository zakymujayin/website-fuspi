"use client";

import { useRef, type KeyboardEvent, type MouseEvent } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type FocalPointEditorProps = {
  imageUrl: string;
  alt: string;
  x: number | null;
  y: number | null;
  onChange: (x: number, y: number) => void;
  label: string;
  hint: string;
};

/**
 * Click (or arrow-key, for keyboard users) to place the focal point that
 * `object-position` keeps visible wherever this photo gets `object-cover`
 * cropped on the public site. Pure UI — no network calls of its own.
 */
export function FocalPointEditor({ imageUrl, alt, x, y, onChange, label, hint }: FocalPointEditorProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const pointX = x ?? 50;
  const pointY = y ?? 50;

  function setFromClientPoint(clientX: number, clientY: number) {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const nextX = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const nextY = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    onChange(Math.round(nextX), Math.round(nextY));
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    setFromClientPoint(event.clientX, event.clientY);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 2;
    let nextX = pointX;
    let nextY = pointY;
    switch (event.key) {
      case "ArrowLeft": nextX = clamp(pointX - step, 0, 100); break;
      case "ArrowRight": nextX = clamp(pointX + step, 0, 100); break;
      case "ArrowUp": nextY = clamp(pointY - step, 0, 100); break;
      case "ArrowDown": nextY = clamp(pointY + step, 0, 100); break;
      default: return;
    }
    event.preventDefault();
    onChange(nextX, nextY);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={boxRef}
        tabIndex={0}
        aria-label={label}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="relative aspect-video w-full cursor-crosshair overflow-hidden rounded-lg border border-slate-200 bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-500"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a local/blob preview (upload) or already-served
            asset (editing existing media); either way this is a small in-panel control, not a page image next/image
            is meant to optimize, and `next/image` does not reliably load `blob:` object URLs. */}
        <img src={imageUrl} alt={alt} className="pointer-events-none absolute inset-0 size-full object-cover" />
        <span
          aria-hidden
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-royal-500 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{ left: `${pointX}%`, top: `${pointY}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  );
}

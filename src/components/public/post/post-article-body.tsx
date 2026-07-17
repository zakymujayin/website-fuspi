import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

import { LOCALE_DIRECTION } from "./locale";

type PostArticleBodyProps = {
  html: string;
  /** Actual language `html` is written in — may be Indonesian fallback on an Arabic page. */
  resolvedLocale: AppLocale;
};

/**
 * Tailwind descendant-selector styling for every tag the sanitizer allows
 * (`src/lib/security/sanitize.ts` `ALLOWED_TAGS`). No Tailwind Typography
 * plugin and no `globals.css` class exist for this, so the whole article
 * "prose" contract lives here as arbitrary-variant utilities on the single
 * wrapper element — logical properties only (`ps-`/`border-s-`/`text-start`),
 * never a physical-direction opposite. Tables and `pre` scroll horizontally
 * inside themselves instead of ever overflowing the page.
 */
const ARTICLE_PROSE_CLASSES = [
  // Paragraphs
  "[&_p]:mb-5 [&_p]:break-words [&_p:last-child]:mb-0",
  // Headings (H1 is the page title; article content starts at H2)
  "[&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:break-words [&_h2]:text-balance [&_h2]:font-display [&_h2]:text-[28px] [&_h2]:leading-[34px] [&_h2]:font-bold [&_h2]:text-slate-900",
  "[&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:break-words [&_h3]:font-display [&_h3]:text-xl [&_h3]:leading-7 [&_h3]:font-semibold [&_h3]:text-slate-900",
  "[&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:break-words [&_h4]:font-display [&_h4]:text-lg [&_h4]:leading-[26px] [&_h4]:font-semibold [&_h4]:text-slate-900",
  "[&_h5]:mt-4 [&_h5]:mb-2 [&_h5]:break-words [&_h5]:font-display [&_h5]:text-base [&_h5]:font-semibold [&_h5]:text-slate-900",
  "[&_h6]:mt-4 [&_h6]:mb-2 [&_h6]:break-words [&_h6]:font-display [&_h6]:text-sm [&_h6]:font-semibold [&_h6]:tracking-wide [&_h6]:text-slate-600 [&_h6]:uppercase",
  // Lists
  "[&_ul]:mb-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:ps-6",
  "[&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:ps-6",
  "[&_li]:break-words [&_li]:leading-[1.75]",
  // Blockquote
  "[&_blockquote]:my-6 [&_blockquote]:break-words [&_blockquote]:border-s-4 [&_blockquote]:border-royal-200 [&_blockquote]:ps-4 [&_blockquote]:text-slate-600 [&_blockquote]:italic",
  // Links
  "[&_a]:break-words [&_a]:font-medium [&_a]:text-royal-600 [&_a]:underline [&_a]:decoration-royal-200 [&_a]:underline-offset-2 [&_a:hover]:text-royal-700",
  // Figures / images
  "[&_figure]:my-6",
  "[&_figcaption]:mt-2 [&_figcaption]:break-words [&_figcaption]:text-[13px] [&_figcaption]:text-slate-500 [&_figcaption]:italic",
  "[&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg",
  // Tables — scroll horizontally inside themselves, never the page
  "[&_table]:my-6 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-sm",
  "[&_caption]:mb-2 [&_caption]:text-[13px] [&_caption]:text-slate-500",
  "[&_th]:border-b [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-start [&_th]:font-medium [&_th]:text-slate-700",
  "[&_td]:border-b [&_td]:border-slate-100 [&_td]:px-3 [&_td]:py-2 [&_td]:break-words [&_td]:align-top",
  // Code — `pre` scrolls horizontally; inline `code` breaks instead
  "[&_pre]:my-4 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-50 [&_pre]:p-4 [&_pre]:text-[13px] [&_pre]:leading-relaxed",
  "[&_code]:break-words [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.875em] [&_code]:text-royal-700",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-800",
  // Divider
  "[&_hr]:my-8 [&_hr]:border-slate-200",
].join(" ");

/**
 * Renders already re-sanitized article HTML (manifest data requirement 4).
 * Callers must call `sanitizeStoredContentOrNull` first and render the
 * translated unavailable state instead of this component when it returns
 * `null` — this component never sanitizes on its own.
 */
export function PostArticleBody({ html, resolvedLocale }: PostArticleBodyProps) {
  return (
    <div
      lang={resolvedLocale}
      dir={LOCALE_DIRECTION[resolvedLocale]}
      className={cn(
        "prose-measure min-w-0 text-base leading-[1.75] text-slate-700",
        ARTICLE_PROSE_CLASSES,
      )}
      // `html` is DOMPurify-sanitized by sanitizeStoredContentOrNull before this renders.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

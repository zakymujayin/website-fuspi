type PostArticleBodyProps = {
  html: string;
};

/**
 * Renders already re-sanitized article HTML (manifest data requirement 4).
 * Callers must call `sanitizeStoredContentOrNull` first and render the
 * translated unavailable state instead of this component when it returns
 * `null` — this component never sanitizes on its own.
 */
export function PostArticleBody({ html }: PostArticleBodyProps) {
  return (
    <div
      className="prose-measure prose-fuspi text-base leading-[1.75] text-slate-700"
      // `html` is DOMPurify-sanitized by sanitizeStoredContentOrNull before this renders.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

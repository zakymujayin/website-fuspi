# Handoff — M3-CLAUDE-POST-EDITOR-RSC-FIX

- **Task ID:** `M3-CLAUDE-POST-EDITOR-RSC-FIX`
- **Branch:** `ai/claude/m3-post-editor-rsc-fix`
- **Base SHA:** `b063d1e`
- **Author:** Claude Sonnet 5, standing in for the Claude lane (ADR-0002).

## The defect (found by DeepSeek editor QA, confirmed in a real browser)

`/admin/posts/new` and `/admin/posts/[postId]/edit` crashed to the error boundary on **every** load:

```text
Error: Functions cannot be passed directly to Client Components...
```

`buildPostEditorLabels(t)` returned an object of **functions** (`localeLegend`, `errorFor`, …); the
server pages passed it into the client `PostEditorForm`. RSC cannot serialize functions, so the page
rendered "This page couldn't load". This was a real defect I shipped in `M3-CLAUDE-POST-EDITOR-BASIC`
— the unit tests missed it (they render the form directly in jsdom, no RSC boundary) and my original
"runtime verification" only hit the API and grepped the streamed RSC payload for "Tulis Berita",
which is present in the label JSON even when the page crashes. I never loaded the page in a browser.
DeepSeek's QA caught it.

## Fix

`PostEditorForm` is `"use client"`, so it now resolves its own strings with next-intl's client
`useTranslations("AdminPostEditor")` instead of receiving a functions-bearing `labels` prop:

- removed the `labels` prop and the `PostEditorLabels` type;
- the form calls `useTranslations` and interpolates `localeLegend` locally as
  `t("localeLegend", { locale: t(`locale.${locale}`) })`, error copy as `t(messageKey)`;
- `new/page.tsx` and `edit/page.tsx` no longer build or pass `labels`;
- deleted `src/components/admin/posts/post-editor-labels.ts` (nothing else imported it — the list is
  a Server Component and keeps its own labels).

No message, contract, API, payload/error-module, or E2E change.

## Verification — including the browser-render step that was skipped originally

| Command | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm test` | 43 files, 669 passed, 0 failed |
| `npm run build` | PASS — both routes registered |
| `git diff --check` | clean |

**Real browser render against PostgreSQL (the missing check):**

```text
/id/admin/posts/new -> h1="Tulis Berita"  titleFieldMatches=3  inputs=11
/ar/admin/posts/new -> h1="كتابة خبر"      titleFieldMatches=3  inputs=11
pageerrors: NONE
```

The form now renders, in both ID and AR, with no page errors. The Arabic title input carries
`dir="rtl"`. The three "Judul" matches are the id/en/ar content sections; each fieldset has an
accessible group name (`Konten Bahasa Indonesia` / `... Inggris` / `... Arab`), so the labels ARE
correctly associated — an earlier worry about label association was unfounded.

## Follow-up REQUIRED before the editor QA can pass — DeepSeek lane

Running DeepSeek's `e2e/m3/admin-post-editor.spec.ts` against this fix: tests 7 and 8 now PASS, but
tests 1–6 fail with a **new, legitimate spec bug**:

```text
strict mode violation: getByLabel('Judul') resolved to 3 elements (id/en/ar content sections)
```

`fillIndonesianFields` targets `page.getByLabel("Judul")`, which is ambiguous across the three
content-locale sections. It must scope to the Indonesian fieldset, exactly as Playwright suggests:

```ts
page.getByRole("group", { name: "Konten Bahasa Indonesia" }).getByLabel("Judul")
```

This is DeepSeek's file and outside this task's lease, so it is left for a QA-lane correction. The
integrator has opened `M3-DEEPSEEK-POST-EDITOR-QA` follow-up guidance accordingly. Do not merge the
editor QA spec until it scopes its locators; this product fix can merge independently since it is
proven at unit + build + browser-render level.

## Requested contract/dependency change

None.

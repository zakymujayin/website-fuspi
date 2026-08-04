import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

const { PagePublicationActions, availableIntents } = await import(
  "@/components/admin/pages/page-publication-actions"
);

describe("availableIntents", () => {
  it("returns no intents when the actor cannot publish", () => {
    expect(availableIntents("DRAFT", false)).toEqual([]);
  });

  it("offers publish and archive from draft", () => {
    expect(availableIntents("DRAFT", true)).toEqual(["PUBLISH_NOW", "ARCHIVE"]);
  });

  it("offers return-to-draft and archive from published", () => {
    expect(availableIntents("PUBLISHED", true)).toEqual(["RETURN_TO_DRAFT", "ARCHIVE"]);
  });

  it("offers return-to-draft from archived", () => {
    expect(availableIntents("ARCHIVED", true)).toEqual(["RETURN_TO_DRAFT"]);
  });
});

describe("PagePublicationActions", () => {
  it("renders nothing when no intents are available", () => {
    const markup = renderToStaticMarkup(
      <PagePublicationActions
        pageId="page-1"
        state="DRAFT"
        canPublish={false}
        mutationBusy={false}
        beginMutation={() => ({ token: 1, version: 1 })}
        finishMutation={() => {}}
      />,
    );
    expect(markup).toBe("");
  });

  it("renders current status and action buttons", () => {
    const markup = renderToStaticMarkup(
      <PagePublicationActions
        pageId="page-1"
        state="DRAFT"
        canPublish={true}
        mutationBusy={false}
        beginMutation={() => ({ token: 1, version: 1 })}
        finishMutation={() => {}}
      />,
    );
    expect(markup).toContain("t:title");
    expect(markup).toContain("t:state.DRAFT");
    expect(markup).toContain("t:action.PUBLISH_NOW");
    expect(markup).toContain("t:action.ARCHIVE");
  });
});

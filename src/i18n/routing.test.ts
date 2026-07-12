import {describe, expect, it} from "vitest";

import {routing} from "./routing";

describe("locale contract", () => {
  it("keeps Indonesian as default and exposes all v1 locales", () => {
    expect(routing.defaultLocale).toBe("id");
    expect(routing.locales).toEqual(["id", "en", "ar"]);
  });
});

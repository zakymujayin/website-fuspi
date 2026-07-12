import {defineRouting} from "next-intl/routing";

export const routing = defineRouting({
  locales: ["id", "en", "ar"],
  defaultLocale: "id",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];

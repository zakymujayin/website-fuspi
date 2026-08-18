"use client";

import { useLocale } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

import { SIDEBAR_MENU_GROUPS } from "@/components/admin/admin-sidebar-data";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { institution } from "@/config/institution";

type TranslationValue = string;

function getActivePath(pathname: string) {
  const withoutLocale = pathname.replace(/^\/[a-z]{2}/, "") || "/admin";
  return withoutLocale === "/admin" ? "/admin" : withoutLocale;
}

function isActive(itemHref: string, currentPath: string) {
  if (itemHref === "/admin") {
    return currentPath === "/admin";
  }
  return currentPath.startsWith(itemHref);
}

export function AdminSidebarServer({
  translations,
}: {
  translations: {
    sidebarLabel: TranslationValue;
    groups: Record<string, TranslationValue>;
    items: Record<string, TranslationValue>;
  };
}) {
  const pathname = usePathname();
  const activePath = getActivePath(pathname);
  const locale = useLocale();
  // The Sidebar primitive positions itself with a fixed physical left/right
  // offset (see src/components/ui/sidebar.tsx) rather than a logical
  // inset-inline-start, so it doesn't auto-mirror for dir="rtl" — it has to
  // be told which physical side to render on.
  const side = locale === "ar" ? "right" : "left";

  return (
    <Sidebar side={side} collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-3 p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <span className="font-display text-sm font-bold">F</span>
          </div>
          <span className="font-display text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            {institution.shortName}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {SIDEBAR_MENU_GROUPS.map((group) => {
          const groupLabel =
            translations.groups[group.labelKey] || group.labelKey;
          return (
            <SidebarGroup key={group.labelKey}>
              <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const active = isActive(item.href, activePath);
                    const label = translations.items[item.labelKey] || item.labelKey;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={active}
                          tooltip={label}
                          render={<Link href={item.href} />}
                        >
                          <item.icon aria-hidden />
                          <span>{label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

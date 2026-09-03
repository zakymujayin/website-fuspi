"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import { SIDEBAR_MENU_GROUPS } from "@/components/admin/admin-sidebar-data";
import { BookingOnlyAdminRoleSchema, type AuthRole } from "@/contracts/auth";
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

type SidebarGroup = (typeof SIDEBAR_MENU_GROUPS)[number];

function groupIsActive(group: SidebarGroup, currentPath: string) {
  return group.items.some((item) => isActive(item.href, currentPath));
}

export function AdminSidebarServer({
  translations,
  userRole,
}: {
  translations: {
    sidebarLabel: TranslationValue;
    groups: Record<string, TranslationValue>;
    items: Record<string, TranslationValue>;
  };
  userRole: AuthRole;
}) {
  const pathname = usePathname();
  const activePath = getActivePath(pathname);
  const tNav = useTranslations("Nav");
  const bookingOnly = BookingOnlyAdminRoleSchema.safeParse(userRole).success;
  const groupKeys = useMemo(() => SIDEBAR_MENU_GROUPS.map((group) => group.labelKey), []);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(groupKeys),
  );

  return (
    <Sidebar collapsible="icon" variant="sidebar">
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
          const items = bookingOnly
            ? group.items.filter((item) => item.href === "/admin/peminjaman")
            : group.items;
          if (items.length === 0) return null;
          const groupLabel =
            translations.groups[group.labelKey] || group.labelKey;
          const groupActive = groupIsActive(group, activePath);
          // The current section is always visible after navigation, while the
          // other groups remember the administrator's own open/closed choice.
          const isOpen = groupActive || openGroups.has(group.labelKey);
          const resolvedGroupLabel = "labelNamespace" in group && group.labelNamespace === "Nav"
            ? tNav(group.labelKey as never)
            : groupLabel;
          return (
            <SidebarGroup key={group.labelKey}>
              <SidebarGroupLabel
                render={<button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-start text-xs font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  aria-expanded={isOpen}
                  onClick={() => setOpenGroups((current) => {
                    const next = new Set(current);
                    if (next.has(group.labelKey)) next.delete(group.labelKey);
                    else next.add(group.labelKey);
                    return next;
                  })}
                />}
              >
                  <span className={groupActive ? "text-sidebar-foreground" : undefined}>{resolvedGroupLabel}</span>
                  <ChevronDownIcon
                    aria-hidden
                    className={`size-3.5 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
                  />
              </SidebarGroupLabel>
              <SidebarGroupContent className={isOpen ? undefined : "hidden"}>
                <SidebarMenu>
                  {items.map((item) => {
                    const active = isActive(item.href, activePath);
                    const label = "labelNamespace" in item && item.labelNamespace === "Nav"
                      ? tNav(item.labelKey as never)
                      : translations.items[item.labelKey] || item.labelKey;
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

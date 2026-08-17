"use client";

import { usePathname } from "@/i18n/navigation";
import {
  ChevronRightIcon,
  HomeIcon,
  KeyRoundIcon,
  LogOutIcon,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function getBreadcrumbs(
  pathname: string,
  itemLabels: Record<string, string>,
) {
  const withoutLocale = pathname.replace(/^\/[a-z]{2}/, "") || "/admin";
  const segments = withoutLocale.split("/").filter(Boolean);
  if (segments.length === 0 || (segments.length === 1 && segments[0] === "admin")) {
    return [{ label: itemLabels["dashboard"] || "Dashboard", href: "/admin" }];
  }

  const crumbs: { label: string; href: string }[] = [
    { label: itemLabels["dashboard"] || "Dashboard", href: "/admin" },
  ];

  let currentPath = "";
  for (let i = 1; i < segments.length; i++) {
    currentPath += "/" + segments[i];
    const key = segments[i];
    const translatedLabel = itemLabels[key] || key;
    crumbs.push({
      label: translatedLabel,
      href: "/admin" + currentPath,
    });
  }

  return crumbs;
}

export function AdminHeader({
  userDisplayName,
  userInitial,
  translations,
  onSignOut,
}: {
  userDisplayName: string;
  userInitial: string;
  translations: {
    items: Record<string, string>;
    userMenuLabel: string;
    changePassword: string;
    signOut: string;
  };
  onSignOut: () => Promise<void>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname, translations.items);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger />

      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronRightIcon
                aria-hidden
                className="size-3.5 text-muted-foreground"
              />
            )}
            {index === 0 ? (
              <HomeIcon
                aria-hidden
                className="size-3.5 text-muted-foreground"
              />
            ) : null}
            <span
              className={cn(
                index === crumbs.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      <div className="ms-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="size-7 cursor-pointer">
              <AvatarFallback className="text-xs">
                {userInitial}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">{userDisplayName}</p>
                <p className="text-xs text-muted-foreground">
                  {translations.userMenuLabel}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/change-password")}
              className="cursor-pointer"
            >
              <KeyRoundIcon data-icon aria-hidden />
              {translations.changePassword}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                void onSignOut();
              }}
            >
              <LogOutIcon data-icon aria-hidden />
              {translations.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

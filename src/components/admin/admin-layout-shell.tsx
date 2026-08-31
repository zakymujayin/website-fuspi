"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebarServer } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import type { AuthRole } from "@/contracts/auth";

type TranslationGroup = Record<string, string>;

interface AdminLayoutShellProps {
  children: React.ReactNode;
  translations: {
    sidebarLabel: string;
    groups: TranslationGroup;
    items: TranslationGroup;
  };
  userRole: AuthRole;
  userDisplayName: string;
  userInitial: string;
  headerTranslations: {
    items: TranslationGroup;
    userMenuLabel: string;
    changePassword: string;
    signOut: string;
  };
  onSignOut: () => Promise<void>;
}

export function AdminLayoutShell({
  children,
  translations,
  userRole,
  userDisplayName,
  userInitial,
  headerTranslations,
  onSignOut,
}: AdminLayoutShellProps) {
  return (
    <TooltipProvider delay={300}>
      <SidebarProvider defaultOpen={true}>
        <AdminSidebarServer translations={translations} userRole={userRole} />
        <div className="flex w-full flex-1 flex-col bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ms-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ms-2">
          <AdminHeader
            userDisplayName={userDisplayName}
            userInitial={userInitial}
            translations={headerTranslations}
            onSignOut={onSignOut}
          />
          <main
            id="main"
            tabIndex={-1}
            className="flex-1 overflow-auto p-4 outline-none sm:p-6"
          >
            {children}
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}

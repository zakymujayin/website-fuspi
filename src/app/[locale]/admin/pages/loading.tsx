import { AdminPageListSkeleton } from "@/components/admin/pages/page-list-skeleton";

export default function AdminPagesLoading() {
  return (
    <section className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-4 w-72 animate-pulse rounded-lg bg-slate-200" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200" />
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="h-10 w-72 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-200" />
      </div>
      <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-slate-200" />
      <AdminPageListSkeleton />
    </section>
  );
}

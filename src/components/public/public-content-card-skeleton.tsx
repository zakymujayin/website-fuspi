function Skeleton({className}: {className?: string}) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className ?? ""}`} />;
}

export function PublicContentCardSkeleton() {
  return (
    <div aria-busy className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <Skeleton className="aspect-video w-full" />
      <div className="flex flex-col gap-2 p-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function PublicContentListGridSkeleton({count = 6}: {count?: number}) {
  return (
    <div aria-busy className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({length: count}, (_, index) => (
        <PublicContentCardSkeleton key={index} />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

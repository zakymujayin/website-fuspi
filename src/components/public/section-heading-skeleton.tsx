function Skeleton({className}: {className?: string}) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className ?? ""}`} />;
}

export function SectionHeadingSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-5 w-80" />
      <Skeleton className="h-0.5 w-12" />
    </div>
  );
}

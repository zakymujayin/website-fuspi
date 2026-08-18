export function AdminFormLayout({
  main,
  sidebar,
}: {
  main: React.ReactNode;
  sidebar: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
      <div className="min-w-0 lg:col-span-8">{main}</div>
      <div className="min-w-0 lg:sticky lg:top-20 lg:col-span-4">
        {sidebar}
      </div>
    </div>
  );
}

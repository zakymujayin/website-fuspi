import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  title: string;
  description?: string;
  as?: "h1" | "h2" | "h3";
  id?: string;
  className?: string;
};

/**
 * The 2px brass rule under the title is the site's single fixed ornament
 * (docs/03 "Elemen signature"); it is drawn by the `section-rule` utility.
 */
export function SectionHeading({
  title,
  description,
  as: Heading = "h2",
  id,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("text-start", className)}>
      <Heading
        id={id}
        className={cn(
          "section-rule font-display font-bold tracking-tight text-slate-900",
          Heading === "h1" ? "text-3xl md:text-4xl" : "text-2xl md:text-[28px]",
        )}
      >
        {title}
      </Heading>
      {description ? (
        <p className="prose-measure mt-4 text-slate-600">{description}</p>
      ) : null}
    </div>
  );
}

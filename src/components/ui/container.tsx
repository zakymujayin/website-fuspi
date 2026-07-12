import { cn } from "@/lib/utils";

function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div data-slot="container" className={cn("container-fuspi", className)} {...props} />
  );
}

export { Container };

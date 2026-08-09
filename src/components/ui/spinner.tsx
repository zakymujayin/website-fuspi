import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"

/* Decorative by default: the registry hard-codes an English `aria-label`, which
   a trilingual UI must not ship. Callers announce progress in their own
   localized live region instead. */
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      data-slot="spinner"
      aria-hidden
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }

import { Breadcrumb, type BreadcrumbItem } from "@/components/public/breadcrumb";

/**
 * Post-flow alias for the shared {@link Breadcrumb} component (docs/17-J).
 * Kept as a distinct export so existing Post routes and tests don't need to
 * change import paths.
 */
export type PostBreadcrumbItem = BreadcrumbItem;
export const PostBreadcrumb = Breadcrumb;

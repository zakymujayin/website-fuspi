import {
  BookOpenText,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  LibraryBig,
  ScrollText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import type {AcademicResourceKey} from "@/components/public/academic-resources";

/** Kept beside the registry but in its own module so `nav-items` stays icon-free. */
export const ACADEMIC_RESOURCE_ICONS: Record<AcademicResourceKey | "studyPrograms", LucideIcon> = {
  studyPrograms: GraduationCap,
  lectureSchedule: ClipboardList,
  academicCalendar: CalendarDays,
  curriculum: BookOpenText,
  courseCatalog: LibraryBig,
  academicDocs: FileText,
  accreditation: ShieldCheck,
  academicGuidelines: ScrollText,
};

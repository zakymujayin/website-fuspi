"use client";

import {BookOpenIcon, GraduationCapIcon, UserRoundIcon} from "lucide-react";
import {useState, type ReactNode} from "react";

import type {AppLocale} from "@/i18n/routing";

type WorkspaceProps = {
  locale: AppLocale;
  profile: ReactNode;
  records: ReactNode;
  academic: ReactNode;
};

const COPY = {
  id: {
    label: "Bagian editor dosen",
    profile: "Profil utama",
    records: "Pendidikan & publikasi",
    academic: "HKI & pengajaran",
    profileHint: "Identitas dan informasi publik",
    recordsHint: "Riwayat akademik dan karya ilmiah",
    academicHint: "Kekayaan intelektual dan mata kuliah",
  },
  en: {
    label: "Lecturer editor sections",
    profile: "Main profile",
    records: "Education & publications",
    academic: "IP & teaching",
    profileHint: "Identity and public information",
    recordsHint: "Academic history and scholarly work",
    academicHint: "Intellectual property and courses",
  },
  ar: {
    label: "أقسام تحرير المحاضر",
    profile: "الملف الرئيسي",
    records: "المؤهلات والمنشورات",
    academic: "الملكية والتدريس",
    profileHint: "الهوية والمعلومات العامة",
    recordsHint: "السجل الأكاديمي والأعمال العلمية",
    academicHint: "الملكية الفكرية والمقررات",
  },
} as const;

export function LecturerAdminWorkspace({locale, profile, records, academic}: WorkspaceProps) {
  const t = COPY[locale];
  const [active, setActive] = useState<"profile" | "records" | "academic">("profile");
  const tabs = [
    {id: "profile" as const, label: t.profile, hint: t.profileHint, icon: UserRoundIcon, content: profile},
    {id: "records" as const, label: t.records, hint: t.recordsHint, icon: GraduationCapIcon, content: records},
    {id: "academic" as const, label: t.academic, hint: t.academicHint, icon: BookOpenIcon, content: academic},
  ];

  return (
    <div className="mt-8">
      <div role="tablist" aria-label={t.label} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-3">
        {tabs.map(({id, label, hint, icon: Icon}) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`lecturer-editor-tab-${id}`}
              aria-selected={selected}
              aria-controls={`lecturer-editor-panel-${id}`}
              onClick={() => setActive(id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-white/70 hover:text-slate-900"}`}
            >
              <Icon aria-hidden className={`size-4 shrink-0 ${selected ? "text-primary" : "text-slate-400"}`} />
              <span className="min-w-0"><span className="block truncate text-sm font-semibold">{label}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{hint}</span></span>
            </button>
          );
        })}
      </div>
      {tabs.map(({id, content}) => (
        <div key={id} id={`lecturer-editor-panel-${id}`} role="tabpanel" aria-labelledby={`lecturer-editor-tab-${id}`} hidden={active !== id} className="pt-1">
          {content}
        </div>
      ))}
    </div>
  );
}

import {
  BarChart3Icon,
  Building2Icon,
  CalendarIcon,
  FileDownIcon,
  FileTextIcon,
  GalleryHorizontalIcon,
  GraduationCapIcon,
  HandshakeIcon,
  ImageIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  LayoutPanelTopIcon,
  ListTreeIcon,
  MegaphoneIcon,
  MessageCircleQuestionIcon,
  NewspaperIcon,
  QuoteIcon,
  ShieldAlertIcon,
  SlidersHorizontalIcon,
  TrophyIcon,
  UserPlusIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react";

export const SIDEBAR_MENU_GROUPS = [
  {
    labelKey: "dashboard",
    items: [
      {
        href: "/admin",
        icon: LayoutDashboardIcon,
        labelKey: "dashboard",
      },
    ],
  },
  {
    labelKey: "homepage",
    items: [
      {
        href: "/admin/beranda/slider",
        icon: GalleryHorizontalIcon,
        labelKey: "homeSlider",
      },
      {
        href: "/admin/beranda/statistik",
        icon: BarChart3Icon,
        labelKey: "homeStatistic",
      },
      {
        href: "/admin/beranda/bagian",
        icon: LayoutPanelTopIcon,
        labelKey: "homeSection",
      },
      {
        href: "/admin/beranda/video",
        icon: VideoIcon,
        labelKey: "homeVideo",
      },
      {
        href: "/admin/beranda/pengaturan",
        icon: SlidersHorizontalIcon,
        labelKey: "homeSettings",
      },
      {
        href: "/admin/fasilitas",
        icon: LandmarkIcon,
        labelKey: "facilities",
      },
    ],
  },
  {
    labelKey: "content",
    items: [
      { href: "/admin/pages", icon: FileTextIcon, labelKey: "pages" },
      { href: "/admin/posts", icon: NewspaperIcon, labelKey: "posts" },
      { href: "/admin/pengumuman", icon: MegaphoneIcon, labelKey: "announcements" },
      { href: "/admin/kolom", icon: FileTextIcon, labelKey: "kolom" },
      { href: "/admin/media", icon: ImageIcon, labelKey: "media" },
      { href: "/admin/taksonomi", icon: ListTreeIcon, labelKey: "taxonomies" },
    ],
  },
  {
    labelKey: "publications",
    items: [
      { href: "/admin/layanan", icon: Building2Icon, labelKey: "services" },
      {
        href: "/admin/kerjasama",
        icon: HandshakeIcon,
        labelKey: "partnerships",
      },
      {
        href: "/admin/beasiswa",
        icon: GraduationCapIcon,
        labelKey: "scholarships",
      },
      { href: "/admin/prestasi", icon: TrophyIcon, labelKey: "achievements" },
      { href: "/admin/kegiatan", icon: UsersIcon, labelKey: "activities" },
      {
        href: "/admin/impor-dosen",
        icon: UserPlusIcon,
        labelKey: "lecturerImport",
      },
      {
        href: "/admin/pengaduan/ppks",
        icon: ShieldAlertIcon,
        labelKey: "ppksReports",
      },
    ],
  },
  {
    labelKey: "others",
    items: [
      { href: "/admin/dokumen", icon: FileDownIcon, labelKey: "documents" },
      { href: "/admin/album", icon: ImageIcon, labelKey: "albums" },
      { href: "/admin/agenda", icon: CalendarIcon, labelKey: "events" },
      { href: "/admin/faq", icon: MessageCircleQuestionIcon, labelKey: "faq" },
      {
        href: "/admin/testimoni",
        icon: QuoteIcon,
        labelKey: "testimonials",
      },
    ],
  },
] as const;

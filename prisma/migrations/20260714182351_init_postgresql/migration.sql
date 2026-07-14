-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('id', 'en', 'ar');

-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE');

-- CreateEnum
CREATE TYPE "GovernanceStatus" AS ENUM ('CURRENT', 'REVIEW_DUE', 'STALE', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'PETUGAS', 'SATGAS_PPKS');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('BERITA', 'PENGUMUMAN', 'INFORMASI', 'KOLOM');

-- CreateEnum
CREATE TYPE "ColumnType" AS ENUM ('DEKAN', 'DOSEN', 'MAHASISWA');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StorageClass" AS ENUM ('PUBLIC', 'PRIVATE', 'PPKS_PRIVATE');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('PUSAT_STUDI', 'LABORATORIUM', 'ORGANISASI_MAHASISWA', 'LEMBAGA');

-- CreateEnum
CREATE TYPE "PartnershipLevel" AS ENUM ('INTERNASIONAL', 'NASIONAL', 'LOKAL');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('AKADEMIK', 'LABORATORIUM', 'UMUM');

-- CreateEnum
CREATE TYPE "AchievementLevel" AS ENUM ('INTERNASIONAL', 'NASIONAL', 'REGIONAL', 'LOKAL');

-- CreateEnum
CREATE TYPE "MenuLocation" AS ENUM ('CONTENT_BAR', 'TOPBAR', 'HEADER', 'FOOTER');

-- CreateEnum
CREATE TYPE "LinkCategory" AS ENUM ('TERKAIT', 'JURNAL');

-- CreateEnum
CREATE TYPE "HomeSectionKey" AS ENUM ('HERO', 'QUICKLINK', 'DEAN', 'STATS', 'NEWS', 'ANNOUNCEMENT', 'PRODI', 'PARTNERSHIP', 'VIDEO', 'AGENDA', 'TESTIMONIAL', 'COLUMN', 'CTA');

-- CreateEnum
CREATE TYPE "ComplaintCategory" AS ENUM ('AKADEMIK', 'FASILITAS', 'LAYANAN', 'KEUANGAN', 'PELECEHAN_SEKSUAL', 'LAINNYA');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('RENDAH', 'NORMAL', 'TINGGI', 'DARURAT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('BARU', 'DIPROSES', 'MENUNGGU_PELAPOR', 'SELESAI', 'DITUTUP');

-- CreateEnum
CREATE TYPE "TicketAccessAction" AS ENUM ('VIEW', 'EXPORT', 'REPLY', 'ASSIGN', 'STATUS_CHANGE', 'ATTACHMENT_DOWNLOAD');

-- CreateEnum
CREATE TYPE "TicketEvent" AS ENUM ('CREATED', 'ASSIGNED', 'REPLIED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'PAUSED', 'RESUMED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('MENUNGGU', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN', 'SELESAI');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CREATE', 'UPDATE', 'PUBLISH', 'ARCHIVE', 'LOGIN', 'LOGIN_FAILED', 'VIEW_SENSITIVE', 'EXPORT', 'CHANGE_ROLE', 'CHANGE_PASSWORD');

-- CreateEnum
CREATE TYPE "SequenceKind" AS ENUM ('TICKET', 'BOOKING');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "SurveyQuestionType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'RATING');

-- CreateEnum
CREATE TYPE "PrivacyRequestType" AS ENUM ('ACCESS', 'CORRECTION', 'ERASURE', 'RESTRICTION', 'OBJECTION');

-- CreateEnum
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('RECEIVED', 'VERIFYING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationState" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DataIncidentStatus" AS ENUM ('OPEN', 'CONTAINED', 'INVESTIGATING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AccessibilityIssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'FIXED', 'VERIFIED', 'ACCEPTED_RISK');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AccessibilityRequestStatus" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertAudience" AS ENUM ('ALL', 'PUBLIC', 'ADMIN');

-- CreateEnum
CREATE TYPE "ServiceIncidentStatus" AS ENUM ('INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "RetentionDisposition" AS ENUM ('DELETE', 'ANONYMIZE', 'HOLD');

-- CreateEnum
CREATE TYPE "ServiceHealth" AS ENUM ('OPERATIONAL', 'DEGRADED', 'PARTIAL_OUTAGE', 'MAJOR_OUTAGE', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refreshToken" TEXT,
    "accessToken" TEXT,
    "expiresAt" INTEGER,
    "tokenType" TEXT,
    "scope" TEXT,
    "idToken" TEXT,
    "sessionState" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionToken")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Authenticator" (
    "credentialID" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,

    CONSTRAINT "Authenticator_pkey" PRIMARY KEY ("userId","credentialID")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "type" "PostType" NOT NULL DEFAULT 'BERITA',
    "columnType" "ColumnType",
    "slug" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "categoryId" TEXT,
    "authorId" TEXT,
    "coverMediaId" TEXT,
    "contentOwnerId" TEXT,
    "governanceStatus" "GovernanceStatus" NOT NULL DEFAULT 'CURRENT',
    "lastReviewedAt" TIMESTAMP(3),
    "lastReviewedById" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTranslation" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "excerpt" VARCHAR(500),
    "content" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDesc" VARCHAR(500),
    "coverCaption" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "PostTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryTranslation" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "CategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagTranslation" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "TagTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTag" (
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("postId","tagId")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "heroMediaId" TEXT,
    "contentOwnerId" TEXT,
    "governanceStatus" "GovernanceStatus" NOT NULL DEFAULT 'CURRENT',
    "lastReviewedAt" TIMESTAMP(3),
    "lastReviewedById" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageTranslation" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDesc" VARCHAR(500),
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "PageTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageClass" "StorageClass" NOT NULL DEFAULT 'PUBLIC',
    "checksumSha256" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "alt" TEXT,
    "isDecorative" BOOLEAN NOT NULL DEFAULT false,
    "width" INTEGER,
    "height" INTEGER,
    "encryptionNonce" TEXT,
    "encryptionTag" TEXT,
    "keyVersion" INTEGER,
    "uploaderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyProgram" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "accreditation" TEXT,
    "accreditationExpiry" TIMESTAMP(3),
    "externalUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "logoMediaId" TEXT,
    "curriculumDocumentId" TEXT,
    "brochureDocumentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "contentOwnerId" TEXT,
    "governanceStatus" "GovernanceStatus" NOT NULL DEFAULT 'CURRENT',
    "lastReviewedAt" TIMESTAMP(3),
    "lastReviewedById" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyProgramTranslation" (
    "id" TEXT NOT NULL,
    "studyProgramId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vision" TEXT,
    "mission" TEXT,
    "objectives" TEXT,
    "graduateProfile" TEXT,
    "careerProspects" TEXT,
    "learningOutcomes" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "StudyProgramTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lecturer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nidn" TEXT,
    "nip" TEXT,
    "orcid" TEXT,
    "googleScholarUrl" TEXT,
    "sintaUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "photoMediaId" TEXT,
    "studyProgramId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Lecturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LecturerTranslation" (
    "id" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "position" TEXT,
    "expertise" TEXT,
    "bio" TEXT,
    "officeHours" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "LecturerTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nip" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "photoMediaId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffTranslation" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "position" TEXT,
    "unit" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "StaffTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Research" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "publicationType" TEXT,
    "doi" TEXT,
    "repositoryUrl" TEXT,
    "publisher" TEXT,
    "journal" TEXT,
    "volume" TEXT,
    "issue" TEXT,
    "pages" TEXT,
    "publicationDate" TIMESTAMP(3),
    "language" "Locale",
    "peerReviewed" BOOLEAN NOT NULL DEFAULT false,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Research_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchTranslation" (
    "id" TEXT NOT NULL,
    "researchId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "abstract" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ResearchTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityService" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "location" TEXT,
    "documentUrl" TEXT,

    CONSTRAINT "CommunityService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityServiceTranslation" (
    "id" TEXT NOT NULL,
    "communityServiceId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "CommunityServiceTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LecturerResearch" (
    "lecturerId" TEXT NOT NULL,
    "researchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LecturerResearch_pkey" PRIMARY KEY ("lecturerId","researchId")
);

-- CreateTable
CREATE TABLE "LecturerCommunityService" (
    "lecturerId" TEXT NOT NULL,
    "communityServiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LecturerCommunityService_pkey" PRIMARY KEY ("lecturerId","communityServiceId")
);

-- CreateTable
CREATE TABLE "LecturerPost" (
    "lecturerId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LecturerPost_pkey" PRIMARY KEY ("lecturerId","postId")
);

-- CreateTable
CREATE TABLE "StudyProgramPost" (
    "studyProgramId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyProgramPost_pkey" PRIMARY KEY ("studyProgramId","postId")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "UnitType" NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "externalUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "contentOwnerId" TEXT,
    "governanceStatus" "GovernanceStatus" NOT NULL DEFAULT 'CURRENT',
    "lastReviewedAt" TIMESTAMP(3),
    "lastReviewedById" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitTranslation" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "UnitTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "url" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "contentOwnerId" TEXT,
    "governanceStatus" "GovernanceStatus" NOT NULL DEFAULT 'CURRENT',
    "lastReviewedAt" TIMESTAMP(3),
    "lastReviewedById" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTranslation" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partnership" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "partnerName" TEXT NOT NULL,
    "level" "PartnershipLevel" NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "documentUrl" TEXT,
    "websiteUrl" TEXT,
    "logoMediaId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Partnership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnershipTranslation" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "PartnershipTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scholarship" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "registrationUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Scholarship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScholarshipTranslation" (
    "id" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT,
    "description" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ScholarshipTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "level" "AchievementLevel" NOT NULL,
    "achievedAt" TIMESTAMP(3),

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchievementTranslation" (
    "id" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "AchievementTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentActivity" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "date" TIMESTAMP(3),

    CONSTRAINT "StudentActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentActivityTranslation" (
    "id" TEXT NOT NULL,
    "studentActivityId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "StudentActivityTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityImage" (
    "id" TEXT NOT NULL,
    "studentActivityId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ActivityImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageClass" "StorageClass" NOT NULL DEFAULT 'PUBLIC',
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "contentOwnerId" TEXT,
    "governanceStatus" "GovernanceStatus" NOT NULL DEFAULT 'CURRENT',
    "lastReviewedAt" TIMESTAMP(3),
    "lastReviewedById" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTranslation" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "coverMediaId" TEXT,
    "eventDate" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbumTranslation" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "AlbumTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbumPhoto" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AlbumPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyProgramAlbum" (
    "studyProgramId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyProgramAlbum_pkey" PRIMARY KEY ("studyProgramId","albumId")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "location" "MenuLocation" NOT NULL,
    "url" TEXT,
    "pageId" TEXT,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemTranslation" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "label" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "MenuItemTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeSlider" (
    "id" TEXT NOT NULL,
    "imageMediaId" TEXT NOT NULL,
    "ctaUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HomeSlider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeSliderTranslation" (
    "id" TEXT NOT NULL,
    "homeSliderId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "ctaLabel" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "HomeSliderTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeSection" (
    "id" TEXT NOT NULL,
    "key" "HomeSectionKey" NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "itemLimit" INTEGER NOT NULL DEFAULT 4,
    "ctaUrl" TEXT,
    "backgroundMediaId" TEXT,

    CONSTRAINT "HomeSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeSectionTranslation" (
    "id" TEXT NOT NULL,
    "homeSectionId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "ctaLabel" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "HomeSectionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Statistic" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Statistic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatisticTranslation" (
    "id" TEXT NOT NULL,
    "statisticId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "label" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "StatisticTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickLink" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "QuickLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickLinkTranslation" (
    "id" TEXT NOT NULL,
    "quickLinkId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "label" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "QuickLinkTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalLink" (
    "id" TEXT NOT NULL,
    "category" "LinkCategory" NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ExternalLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalLinkTranslation" (
    "id" TEXT NOT NULL,
    "externalLinkId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "label" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ExternalLinkTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "deanName" TEXT,
    "deanPhotoId" TEXT,
    "videoUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "youtubeUrl" TEXT,
    "xUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "contentOwnerId" TEXT,
    "governanceStatus" "GovernanceStatus" NOT NULL DEFAULT 'CURRENT',
    "lastReviewedAt" TIMESTAMP(3),
    "lastReviewedById" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettingTranslation" (
    "id" TEXT NOT NULL,
    "siteSettingId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "facultyName" TEXT NOT NULL,
    "tagline" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "deanPosition" TEXT,
    "deanMessage" TEXT,
    "videoTitle" TEXT,
    "videoDesc" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "SiteSettingTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "registrationUrl" TEXT,
    "sourceBookingId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "contentOwnerId" TEXT,
    "governanceStatus" "GovernanceStatus" NOT NULL DEFAULT 'CURRENT',
    "lastReviewedAt" TIMESTAMP(3),
    "lastReviewedById" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTranslation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "EventTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "contentOwnerId" TEXT,
    "governanceStatus" "GovernanceStatus" NOT NULL DEFAULT 'CURRENT',
    "lastReviewedAt" TIMESTAMP(3),
    "lastReviewedById" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqTranslation" (
    "id" TEXT NOT NULL,
    "faqId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "category" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "FaqTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoMediaId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestimonialTranslation" (
    "id" TEXT NOT NULL,
    "testimonialId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "currentRole" TEXT,
    "quote" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "TestimonialTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'id',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "trackingTokenHash" TEXT NOT NULL,
    "category" "ComplaintCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TicketStatus" NOT NULL DEFAULT 'BARU',
    "subjectCiphertext" TEXT,
    "descriptionCiphertext" TEXT NOT NULL,
    "reporterIdentityCiphertext" TEXT,
    "resolutionCiphertext" TEXT,
    "encryptionNonce" TEXT,
    "encryptionTag" TEXT,
    "keyVersion" INTEGER,
    "assigneeId" TEXT,
    "responseDueAt" TIMESTAMP(3),
    "resolutionDueAt" TIMESTAMP(3),
    "firstRespondedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "totalPausedSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketReply" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT,
    "bodyCiphertext" TEXT NOT NULL,
    "encryptionNonce" TEXT,
    "encryptionTag" TEXT,
    "keyVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAttachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageClass" "StorageClass" NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "encryptionNonce" TEXT,
    "encryptionTag" TEXT,
    "keyVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAccessLog" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "TicketAccessAction" NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "reasonCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketHistory" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "actorId" TEXT,
    "event" "TicketEvent" NOT NULL,
    "fromStatus" "TicketStatus",
    "toStatus" "TicketStatus",
    "fromPriority" "TicketPriority",
    "toPriority" "TicketPriority",
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "contentOwnerId" TEXT,
    "governanceStatus" "GovernanceStatus" NOT NULL DEFAULT 'CURRENT',
    "lastReviewedAt" TIMESTAMP(3),
    "lastReviewedById" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomTranslation" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "facilities" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "RoomTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomOperatingHour" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "opensAtMinute" INTEGER NOT NULL,
    "closesAtMinute" INTEGER NOT NULL,

    CONSTRAINT "RoomOperatingHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomBlackout" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomBlackout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "trackingTokenHash" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterPhone" TEXT,
    "organization" TEXT,
    "purpose" TEXT NOT NULL,
    "participantCount" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'MENUNGGU',
    "version" INTEGER NOT NULL DEFAULT 1,
    "applicationStorageKey" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingHistory" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "actorId" TEXT,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnualSequence" (
    "id" TEXT NOT NULL,
    "kind" "SequenceKind" NOT NULL,
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnualSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "ActivityAction" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRevision" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "locale" "Locale",
    "scopeKey" TEXT NOT NULL DEFAULT 'root',
    "version" INTEGER NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "changeSummary" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyDefinition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyQuestion" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "type" "SurveyQuestionType" NOT NULL,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveySubmission" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "definitionVersion" INTEGER NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'id',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyAnswer" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "SurveyAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "blockedUntil" TIMESTAMP(3),

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'id',
    "template" TEXT NOT NULL,
    "payload" JSONB,
    "payloadEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "payloadCiphertext" TEXT,
    "encryptionNonce" TEXT,
    "encryptionTag" TEXT,
    "keyVersion" INTEGER,
    "idempotencyKey" TEXT NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redirect" (
    "id" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "destinationPath" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 301,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Redirect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlossaryTerm" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "GlossaryTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlossaryTranslation" (
    "id" TEXT NOT NULL,
    "glossaryTermId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "GlossaryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteAlert" (
    "id" TEXT NOT NULL,
    "severity" "AlertLevel" NOT NULL,
    "audience" "AlertAudience" NOT NULL DEFAULT 'PUBLIC',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isDismissible" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteAlertTranslation" (
    "id" TEXT NOT NULL,
    "siteAlertId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkLabel" TEXT,
    "linkUrl" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "SiteAlertTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceEndpoint" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "ownerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceIncident" (
    "id" TEXT NOT NULL,
    "serviceEndpointId" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "ServiceIncidentStatus" NOT NULL DEFAULT 'INVESTIGATING',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceIncidentTranslation" (
    "id" TEXT NOT NULL,
    "serviceIncidentId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceIncidentTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceIncidentUpdate" (
    "id" TEXT NOT NULL,
    "serviceIncidentId" TEXT NOT NULL,
    "status" "ServiceIncidentStatus" NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'id',
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceIncidentUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyNotice" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "retiredAt" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyNoticeTranslation" (
    "id" TEXT NOT NULL,
    "privacyNoticeId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "PrivacyNoticeTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "privacyNoticeId" TEXT NOT NULL,
    "subjectHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSubjectRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "trackingTokenHash" TEXT NOT NULL,
    "type" "PrivacyRequestType" NOT NULL,
    "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'RECEIVED',
    "verificationState" "VerificationState" NOT NULL DEFAULT 'PENDING',
    "requesterCiphertext" TEXT NOT NULL,
    "requestCiphertext" TEXT NOT NULL,
    "assigneeId" TEXT,
    "resolutionCiphertext" TEXT,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataIncident" (
    "id" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL,
    "systemsAffected" JSONB NOT NULL,
    "dataCategories" JSONB NOT NULL,
    "containmentCiphertext" TEXT,
    "summaryCiphertext" TEXT NOT NULL,
    "status" "DataIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "ownerId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataExportLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "purpose" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL,
    "storageKey" TEXT,
    "expiresAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataExportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionPolicy" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "activeDays" INTEGER,
    "archiveDays" INTEGER,
    "disposition" "RetentionDisposition" NOT NULL,
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "approverId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rationale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessibilityIssue" (
    "id" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "wcagCriterion" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "AccessibilityIssueStatus" NOT NULL DEFAULT 'OPEN',
    "evidence" JSONB,
    "ownerId" TEXT,
    "targetDate" TIMESTAMP(3),
    "fixedAt" TIMESTAMP(3),
    "retestResult" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AccessibilityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessibilityRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "trackingTokenHash" TEXT NOT NULL,
    "status" "AccessibilityRequestStatus" NOT NULL DEFAULT 'RECEIVED',
    "requesterCiphertext" TEXT NOT NULL,
    "requestedFormat" TEXT NOT NULL,
    "resourcePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AccessibilityRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionInfo" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "lastReviewedAt" TIMESTAMP(3) NOT NULL,
    "reviewDueAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AdmissionInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionInfoTranslation" (
    "id" TEXT NOT NULL,
    "admissionInfoId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "AdmissionInfoTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageFeedback" (
    "id" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "reason" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'id',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribeTokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "Authenticator"("credentialID");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_type_status_publishedAt_idx" ON "Post"("type", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Post_contentOwnerId_reviewDueAt_idx" ON "Post"("contentOwnerId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "PostTranslation_locale_idx" ON "PostTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "PostTranslation_postId_locale_key" ON "PostTranslation"("postId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "CategoryTranslation_locale_idx" ON "CategoryTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTranslation_categoryId_locale_key" ON "CategoryTranslation"("categoryId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "TagTranslation_locale_idx" ON "TagTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "TagTranslation_tagId_locale_key" ON "TagTranslation"("tagId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE INDEX "Page_contentOwnerId_reviewDueAt_idx" ON "Page"("contentOwnerId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "PageTranslation_locale_idx" ON "PageTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "PageTranslation_pageId_locale_key" ON "PageTranslation"("pageId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Media_storageKey_key" ON "Media"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "StudyProgram_code_key" ON "StudyProgram"("code");

-- CreateIndex
CREATE UNIQUE INDEX "StudyProgram_slug_key" ON "StudyProgram"("slug");

-- CreateIndex
CREATE INDEX "StudyProgram_contentOwnerId_reviewDueAt_idx" ON "StudyProgram"("contentOwnerId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "StudyProgramTranslation_locale_idx" ON "StudyProgramTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "StudyProgramTranslation_studyProgramId_locale_key" ON "StudyProgramTranslation"("studyProgramId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Lecturer_slug_key" ON "Lecturer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Lecturer_nidn_key" ON "Lecturer"("nidn");

-- CreateIndex
CREATE UNIQUE INDEX "Lecturer_nip_key" ON "Lecturer"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "Lecturer_orcid_key" ON "Lecturer"("orcid");

-- CreateIndex
CREATE INDEX "LecturerTranslation_locale_idx" ON "LecturerTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "LecturerTranslation_lecturerId_locale_key" ON "LecturerTranslation"("lecturerId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_slug_key" ON "Staff"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_nip_key" ON "Staff"("nip");

-- CreateIndex
CREATE INDEX "StaffTranslation_locale_idx" ON "StaffTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "StaffTranslation_staffId_locale_key" ON "StaffTranslation"("staffId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Research_slug_key" ON "Research"("slug");

-- CreateIndex
CREATE INDEX "ResearchTranslation_locale_idx" ON "ResearchTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchTranslation_researchId_locale_key" ON "ResearchTranslation"("researchId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityService_slug_key" ON "CommunityService"("slug");

-- CreateIndex
CREATE INDEX "CommunityServiceTranslation_locale_idx" ON "CommunityServiceTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityServiceTranslation_communityServiceId_locale_key" ON "CommunityServiceTranslation"("communityServiceId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_slug_key" ON "Unit"("slug");

-- CreateIndex
CREATE INDEX "Unit_contentOwnerId_reviewDueAt_idx" ON "Unit"("contentOwnerId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "UnitTranslation_locale_idx" ON "UnitTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "UnitTranslation_unitId_locale_key" ON "UnitTranslation"("unitId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Service_contentOwnerId_reviewDueAt_idx" ON "Service"("contentOwnerId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "ServiceTranslation_locale_idx" ON "ServiceTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTranslation_serviceId_locale_key" ON "ServiceTranslation"("serviceId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Partnership_slug_key" ON "Partnership"("slug");

-- CreateIndex
CREATE INDEX "PartnershipTranslation_locale_idx" ON "PartnershipTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipTranslation_partnershipId_locale_key" ON "PartnershipTranslation"("partnershipId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Scholarship_slug_key" ON "Scholarship"("slug");

-- CreateIndex
CREATE INDEX "ScholarshipTranslation_locale_idx" ON "ScholarshipTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "ScholarshipTranslation_scholarshipId_locale_key" ON "ScholarshipTranslation"("scholarshipId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_slug_key" ON "Achievement"("slug");

-- CreateIndex
CREATE INDEX "AchievementTranslation_locale_idx" ON "AchievementTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "AchievementTranslation_achievementId_locale_key" ON "AchievementTranslation"("achievementId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "StudentActivity_slug_key" ON "StudentActivity"("slug");

-- CreateIndex
CREATE INDEX "StudentActivityTranslation_locale_idx" ON "StudentActivityTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "StudentActivityTranslation_studentActivityId_locale_key" ON "StudentActivityTranslation"("studentActivityId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityImage_studentActivityId_mediaId_key" ON "ActivityImage"("studentActivityId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_slug_key" ON "Document"("slug");

-- CreateIndex
CREATE INDEX "Document_contentOwnerId_reviewDueAt_idx" ON "Document"("contentOwnerId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "DocumentTranslation_locale_idx" ON "DocumentTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTranslation_documentId_locale_key" ON "DocumentTranslation"("documentId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Album_slug_key" ON "Album"("slug");

-- CreateIndex
CREATE INDEX "AlbumTranslation_locale_idx" ON "AlbumTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "AlbumTranslation_albumId_locale_key" ON "AlbumTranslation"("albumId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "AlbumPhoto_albumId_mediaId_key" ON "AlbumPhoto"("albumId", "mediaId");

-- CreateIndex
CREATE INDEX "MenuItem_location_order_idx" ON "MenuItem"("location", "order");

-- CreateIndex
CREATE INDEX "MenuItemTranslation_locale_idx" ON "MenuItemTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemTranslation_menuItemId_locale_key" ON "MenuItemTranslation"("menuItemId", "locale");

-- CreateIndex
CREATE INDEX "HomeSliderTranslation_locale_idx" ON "HomeSliderTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "HomeSliderTranslation_homeSliderId_locale_key" ON "HomeSliderTranslation"("homeSliderId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "HomeSection_key_key" ON "HomeSection"("key");

-- CreateIndex
CREATE INDEX "HomeSectionTranslation_locale_idx" ON "HomeSectionTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "HomeSectionTranslation_homeSectionId_locale_key" ON "HomeSectionTranslation"("homeSectionId", "locale");

-- CreateIndex
CREATE INDEX "StatisticTranslation_locale_idx" ON "StatisticTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "StatisticTranslation_statisticId_locale_key" ON "StatisticTranslation"("statisticId", "locale");

-- CreateIndex
CREATE INDEX "QuickLinkTranslation_locale_idx" ON "QuickLinkTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "QuickLinkTranslation_quickLinkId_locale_key" ON "QuickLinkTranslation"("quickLinkId", "locale");

-- CreateIndex
CREATE INDEX "ExternalLinkTranslation_locale_idx" ON "ExternalLinkTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalLinkTranslation_externalLinkId_locale_key" ON "ExternalLinkTranslation"("externalLinkId", "locale");

-- CreateIndex
CREATE INDEX "SiteSetting_contentOwnerId_reviewDueAt_idx" ON "SiteSetting"("contentOwnerId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "SiteSettingTranslation_locale_idx" ON "SiteSettingTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSettingTranslation_siteSettingId_locale_key" ON "SiteSettingTranslation"("siteSettingId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Event_sourceBookingId_key" ON "Event"("sourceBookingId");

-- CreateIndex
CREATE INDEX "Event_contentOwnerId_reviewDueAt_idx" ON "Event"("contentOwnerId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "EventTranslation_locale_idx" ON "EventTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "EventTranslation_eventId_locale_key" ON "EventTranslation"("eventId", "locale");

-- CreateIndex
CREATE INDEX "Faq_contentOwnerId_reviewDueAt_idx" ON "Faq"("contentOwnerId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "FaqTranslation_locale_idx" ON "FaqTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "FaqTranslation_faqId_locale_key" ON "FaqTranslation"("faqId", "locale");

-- CreateIndex
CREATE INDEX "TestimonialTranslation_locale_idx" ON "TestimonialTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "TestimonialTranslation_testimonialId_locale_key" ON "TestimonialTranslation"("testimonialId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_trackingTokenHash_key" ON "Ticket"("trackingTokenHash");

-- CreateIndex
CREATE INDEX "Ticket_category_status_createdAt_idx" ON "Ticket"("category", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Ticket_assigneeId_status_idx" ON "Ticket"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "TicketReply_ticketId_createdAt_idx" ON "TicketReply"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TicketAttachment_storageKey_key" ON "TicketAttachment"("storageKey");

-- CreateIndex
CREATE INDEX "TicketAttachment_ticketId_idx" ON "TicketAttachment"("ticketId");

-- CreateIndex
CREATE INDEX "TicketAccessLog_ticketId_createdAt_idx" ON "TicketAccessLog"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketAccessLog_userId_createdAt_idx" ON "TicketAccessLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketHistory_ticketId_createdAt_idx" ON "TicketHistory"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Room_slug_key" ON "Room"("slug");

-- CreateIndex
CREATE INDEX "Room_contentOwnerId_reviewDueAt_idx" ON "Room"("contentOwnerId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "RoomTranslation_locale_idx" ON "RoomTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "RoomTranslation_roomId_locale_key" ON "RoomTranslation"("roomId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "RoomOperatingHour_roomId_dayOfWeek_key" ON "RoomOperatingHour"("roomId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "RoomBlackout_roomId_startTime_endTime_idx" ON "RoomBlackout"("roomId", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "Booking"("bookingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_trackingTokenHash_key" ON "Booking"("trackingTokenHash");

-- CreateIndex
CREATE INDEX "Booking_roomId_status_startTime_endTime_idx" ON "Booking"("roomId", "status", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "BookingHistory_bookingId_createdAt_idx" ON "BookingHistory"("bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnnualSequence_kind_year_key" ON "AnnualSequence"("kind", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_key" ON "Holiday"("date");

-- CreateIndex
CREATE INDEX "ActivityLog_actorId_createdAt_idx" ON "ActivityLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_resourceType_resourceId_createdAt_idx" ON "ActivityLog"("resourceType", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentRevision_resourceType_resourceId_version_idx" ON "ContentRevision"("resourceType", "resourceId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRevision_resourceType_resourceId_scopeKey_version_key" ON "ContentRevision"("resourceType", "resourceId", "scopeKey", "version");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyDefinition_slug_key" ON "SurveyDefinition"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyAnswer_submissionId_questionId_key" ON "SurveyAnswer"("submissionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_keyHash_scope_windowStart_key" ON "RateLimitBucket"("keyHash", "scope", "windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationOutbox_idempotencyKey_key" ON "NotificationOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "NotificationOutbox_status_nextAttemptAt_idx" ON "NotificationOutbox"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "Redirect_sourcePath_key" ON "Redirect"("sourcePath");

-- CreateIndex
CREATE UNIQUE INDEX "GlossaryTerm_key_key" ON "GlossaryTerm"("key");

-- CreateIndex
CREATE INDEX "GlossaryTranslation_locale_idx" ON "GlossaryTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "GlossaryTranslation_glossaryTermId_locale_key" ON "GlossaryTranslation"("glossaryTermId", "locale");

-- CreateIndex
CREATE INDEX "SiteAlert_isActive_startsAt_endsAt_idx" ON "SiteAlert"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "SiteAlertTranslation_locale_idx" ON "SiteAlertTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "SiteAlertTranslation_siteAlertId_locale_key" ON "SiteAlertTranslation"("siteAlertId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceEndpoint_slug_key" ON "ServiceEndpoint"("slug");

-- CreateIndex
CREATE INDEX "ServiceIncidentTranslation_locale_idx" ON "ServiceIncidentTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceIncidentTranslation_serviceIncidentId_locale_key" ON "ServiceIncidentTranslation"("serviceIncidentId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyNotice_version_key" ON "PrivacyNotice"("version");

-- CreateIndex
CREATE INDEX "PrivacyNoticeTranslation_locale_idx" ON "PrivacyNoticeTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyNoticeTranslation_privacyNoticeId_locale_key" ON "PrivacyNoticeTranslation"("privacyNoticeId", "locale");

-- CreateIndex
CREATE INDEX "ConsentRecord_subjectHash_purpose_idx" ON "ConsentRecord"("subjectHash", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "DataSubjectRequest_requestNumber_key" ON "DataSubjectRequest"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DataSubjectRequest_trackingTokenHash_key" ON "DataSubjectRequest"("trackingTokenHash");

-- CreateIndex
CREATE INDEX "DataExportLog_actorId_createdAt_idx" ON "DataExportLog"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionPolicy_resourceType_key" ON "RetentionPolicy"("resourceType");

-- CreateIndex
CREATE UNIQUE INDEX "AccessibilityRequest_requestNumber_key" ON "AccessibilityRequest"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AccessibilityRequest_trackingTokenHash_key" ON "AccessibilityRequest"("trackingTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionInfo_slug_key" ON "AdmissionInfo"("slug");

-- CreateIndex
CREATE INDEX "AdmissionInfoTranslation_locale_idx" ON "AdmissionInfoTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionInfoTranslation_admissionInfoId_locale_key" ON "AdmissionInfoTranslation"("admissionInfoId", "locale");

-- CreateIndex
CREATE INDEX "PageFeedback_pageType_pageId_locale_idx" ON "PageFeedback"("pageType", "pageId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_unsubscribeTokenHash_key" ON "Subscriber"("unsubscribeTokenHash");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authenticator" ADD CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTranslation" ADD CONSTRAINT "PostTranslation_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagTranslation" ADD CONSTRAINT "TagTranslation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_heroMediaId_fkey" FOREIGN KEY ("heroMediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageTranslation" ADD CONSTRAINT "PageTranslation_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyProgram" ADD CONSTRAINT "StudyProgram_logoMediaId_fkey" FOREIGN KEY ("logoMediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyProgram" ADD CONSTRAINT "StudyProgram_curriculumDocumentId_fkey" FOREIGN KEY ("curriculumDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyProgram" ADD CONSTRAINT "StudyProgram_brochureDocumentId_fkey" FOREIGN KEY ("brochureDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyProgramTranslation" ADD CONSTRAINT "StudyProgramTranslation_studyProgramId_fkey" FOREIGN KEY ("studyProgramId") REFERENCES "StudyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lecturer" ADD CONSTRAINT "Lecturer_photoMediaId_fkey" FOREIGN KEY ("photoMediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lecturer" ADD CONSTRAINT "Lecturer_studyProgramId_fkey" FOREIGN KEY ("studyProgramId") REFERENCES "StudyProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerTranslation" ADD CONSTRAINT "LecturerTranslation_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_photoMediaId_fkey" FOREIGN KEY ("photoMediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTranslation" ADD CONSTRAINT "StaffTranslation_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchTranslation" ADD CONSTRAINT "ResearchTranslation_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "Research"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityServiceTranslation" ADD CONSTRAINT "CommunityServiceTranslation_communityServiceId_fkey" FOREIGN KEY ("communityServiceId") REFERENCES "CommunityService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerResearch" ADD CONSTRAINT "LecturerResearch_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerResearch" ADD CONSTRAINT "LecturerResearch_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "Research"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerCommunityService" ADD CONSTRAINT "LecturerCommunityService_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerCommunityService" ADD CONSTRAINT "LecturerCommunityService_communityServiceId_fkey" FOREIGN KEY ("communityServiceId") REFERENCES "CommunityService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerPost" ADD CONSTRAINT "LecturerPost_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerPost" ADD CONSTRAINT "LecturerPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyProgramPost" ADD CONSTRAINT "StudyProgramPost_studyProgramId_fkey" FOREIGN KEY ("studyProgramId") REFERENCES "StudyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyProgramPost" ADD CONSTRAINT "StudyProgramPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitTranslation" ADD CONSTRAINT "UnitTranslation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTranslation" ADD CONSTRAINT "ServiceTranslation_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_logoMediaId_fkey" FOREIGN KEY ("logoMediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipTranslation" ADD CONSTRAINT "PartnershipTranslation_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipTranslation" ADD CONSTRAINT "ScholarshipTranslation_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementTranslation" ADD CONSTRAINT "AchievementTranslation_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentActivityTranslation" ADD CONSTRAINT "StudentActivityTranslation_studentActivityId_fkey" FOREIGN KEY ("studentActivityId") REFERENCES "StudentActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityImage" ADD CONSTRAINT "ActivityImage_studentActivityId_fkey" FOREIGN KEY ("studentActivityId") REFERENCES "StudentActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityImage" ADD CONSTRAINT "ActivityImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTranslation" ADD CONSTRAINT "DocumentTranslation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumTranslation" ADD CONSTRAINT "AlbumTranslation_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumPhoto" ADD CONSTRAINT "AlbumPhoto_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumPhoto" ADD CONSTRAINT "AlbumPhoto_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyProgramAlbum" ADD CONSTRAINT "StudyProgramAlbum_studyProgramId_fkey" FOREIGN KEY ("studyProgramId") REFERENCES "StudyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyProgramAlbum" ADD CONSTRAINT "StudyProgramAlbum_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemTranslation" ADD CONSTRAINT "MenuItemTranslation_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeSlider" ADD CONSTRAINT "HomeSlider_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeSliderTranslation" ADD CONSTRAINT "HomeSliderTranslation_homeSliderId_fkey" FOREIGN KEY ("homeSliderId") REFERENCES "HomeSlider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeSection" ADD CONSTRAINT "HomeSection_backgroundMediaId_fkey" FOREIGN KEY ("backgroundMediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeSectionTranslation" ADD CONSTRAINT "HomeSectionTranslation_homeSectionId_fkey" FOREIGN KEY ("homeSectionId") REFERENCES "HomeSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatisticTranslation" ADD CONSTRAINT "StatisticTranslation_statisticId_fkey" FOREIGN KEY ("statisticId") REFERENCES "Statistic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickLinkTranslation" ADD CONSTRAINT "QuickLinkTranslation_quickLinkId_fkey" FOREIGN KEY ("quickLinkId") REFERENCES "QuickLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalLinkTranslation" ADD CONSTRAINT "ExternalLinkTranslation_externalLinkId_fkey" FOREIGN KEY ("externalLinkId") REFERENCES "ExternalLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSetting" ADD CONSTRAINT "SiteSetting_deanPhotoId_fkey" FOREIGN KEY ("deanPhotoId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettingTranslation" ADD CONSTRAINT "SiteSettingTranslation_siteSettingId_fkey" FOREIGN KEY ("siteSettingId") REFERENCES "SiteSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_sourceBookingId_fkey" FOREIGN KEY ("sourceBookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTranslation" ADD CONSTRAINT "EventTranslation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaqTranslation" ADD CONSTRAINT "FaqTranslation_faqId_fkey" FOREIGN KEY ("faqId") REFERENCES "Faq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_photoMediaId_fkey" FOREIGN KEY ("photoMediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestimonialTranslation" ADD CONSTRAINT "TestimonialTranslation_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "Testimonial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAccessLog" ADD CONSTRAINT "TicketAccessLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAccessLog" ADD CONSTRAINT "TicketAccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketHistory" ADD CONSTRAINT "TicketHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTranslation" ADD CONSTRAINT "RoomTranslation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomOperatingHour" ADD CONSTRAINT "RoomOperatingHour_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBlackout" ADD CONSTRAINT "RoomBlackout_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingHistory" ADD CONSTRAINT "BookingHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "SurveyDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySubmission" ADD CONSTRAINT "SurveySubmission_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "SurveyDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SurveySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SurveyQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlossaryTranslation" ADD CONSTRAINT "GlossaryTranslation_glossaryTermId_fkey" FOREIGN KEY ("glossaryTermId") REFERENCES "GlossaryTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteAlertTranslation" ADD CONSTRAINT "SiteAlertTranslation_siteAlertId_fkey" FOREIGN KEY ("siteAlertId") REFERENCES "SiteAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceIncident" ADD CONSTRAINT "ServiceIncident_serviceEndpointId_fkey" FOREIGN KEY ("serviceEndpointId") REFERENCES "ServiceEndpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceIncidentTranslation" ADD CONSTRAINT "ServiceIncidentTranslation_serviceIncidentId_fkey" FOREIGN KEY ("serviceIncidentId") REFERENCES "ServiceIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceIncidentUpdate" ADD CONSTRAINT "ServiceIncidentUpdate_serviceIncidentId_fkey" FOREIGN KEY ("serviceIncidentId") REFERENCES "ServiceIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyNoticeTranslation" ADD CONSTRAINT "PrivacyNoticeTranslation_privacyNoticeId_fkey" FOREIGN KEY ("privacyNoticeId") REFERENCES "PrivacyNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_privacyNoticeId_fkey" FOREIGN KEY ("privacyNoticeId") REFERENCES "PrivacyNotice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionInfoTranslation" ADD CONSTRAINT "AdmissionInfoTranslation_admissionInfoId_fkey" FOREIGN KEY ("admissionInfoId") REFERENCES "AdmissionInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

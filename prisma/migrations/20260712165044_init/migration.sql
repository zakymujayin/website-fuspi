-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `emailVerified` DATETIME(3) NULL,
    `passwordHash` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'EDITOR', 'PETUGAS', 'SATGAS_PPKS') NOT NULL DEFAULT 'EDITOR',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refreshToken` TEXT NULL,
    `accessToken` TEXT NULL,
    `expiresAt` INTEGER NULL,
    `tokenType` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `idToken` TEXT NULL,
    `sessionState` VARCHAR(191) NULL,

    INDEX `Account_userId_idx`(`userId`),
    PRIMARY KEY (`provider`, `providerAccountId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`sessionToken`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationToken` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    PRIMARY KEY (`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Authenticator` (
    `credentialID` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `credentialPublicKey` TEXT NOT NULL,
    `counter` INTEGER NOT NULL,
    `credentialDeviceType` VARCHAR(191) NOT NULL,
    `credentialBackedUp` BOOLEAN NOT NULL,
    `transports` VARCHAR(191) NULL,

    UNIQUE INDEX `Authenticator_credentialID_key`(`credentialID`),
    PRIMARY KEY (`userId`, `credentialID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Post` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('BERITA', 'PENGUMUMAN', 'INFORMASI', 'KOLOM') NOT NULL DEFAULT 'BERITA',
    `columnType` ENUM('DEKAN', 'DOSEN', 'MAHASISWA') NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `publishedAt` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `categoryId` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NULL,
    `coverMediaId` VARCHAR(191) NULL,
    `contentOwnerId` VARCHAR(191) NULL,
    `governanceStatus` ENUM('CURRENT', 'REVIEW_DUE', 'STALE', 'EXPIRED', 'ARCHIVED') NOT NULL DEFAULT 'CURRENT',
    `lastReviewedAt` DATETIME(3) NULL,
    `lastReviewedById` VARCHAR(191) NULL,
    `reviewDueAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Post_slug_key`(`slug`),
    INDEX `Post_type_status_publishedAt_idx`(`type`, `status`, `publishedAt`),
    INDEX `Post_contentOwnerId_reviewDueAt_idx`(`contentOwnerId`, `reviewDueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `excerpt` VARCHAR(500) NULL,
    `content` LONGTEXT NOT NULL,
    `metaTitle` VARCHAR(191) NULL,
    `metaDesc` VARCHAR(500) NULL,
    `coverCaption` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `PostTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `PostTranslation_postId_locale_key`(`postId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Category_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CategoryTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `CategoryTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `CategoryTranslation_categoryId_locale_key`(`categoryId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tag` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Tag_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TagTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `TagTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `TagTranslation_tagId_locale_key`(`tagId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostTag` (
    `postId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`postId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Page` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `order` INTEGER NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 1,
    `parentId` VARCHAR(191) NULL,
    `heroMediaId` VARCHAR(191) NULL,
    `contentOwnerId` VARCHAR(191) NULL,
    `governanceStatus` ENUM('CURRENT', 'REVIEW_DUE', 'STALE', 'EXPIRED', 'ARCHIVED') NOT NULL DEFAULT 'CURRENT',
    `lastReviewedAt` DATETIME(3) NULL,
    `lastReviewedById` VARCHAR(191) NULL,
    `reviewDueAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Page_slug_key`(`slug`),
    INDEX `Page_contentOwnerId_reviewDueAt_idx`(`contentOwnerId`, `reviewDueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `pageId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `metaTitle` VARCHAR(191) NULL,
    `metaDesc` VARCHAR(500) NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `PageTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `PageTranslation_pageId_locale_key`(`pageId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Media` (
    `id` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `storageClass` ENUM('PUBLIC', 'PRIVATE', 'PPKS_PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `checksumSha256` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `alt` VARCHAR(191) NULL,
    `isDecorative` BOOLEAN NOT NULL DEFAULT false,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `encryptionNonce` VARCHAR(191) NULL,
    `encryptionTag` VARCHAR(191) NULL,
    `keyVersion` INTEGER NULL,
    `uploaderId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Media_storageKey_key`(`storageKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudyProgram` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `degree` VARCHAR(191) NOT NULL,
    `accreditation` VARCHAR(191) NULL,
    `accreditationExpiry` DATETIME(3) NULL,
    `externalUrl` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `logoMediaId` VARCHAR(191) NULL,
    `curriculumDocumentId` VARCHAR(191) NULL,
    `brochureDocumentId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 1,
    `contentOwnerId` VARCHAR(191) NULL,
    `governanceStatus` ENUM('CURRENT', 'REVIEW_DUE', 'STALE', 'EXPIRED', 'ARCHIVED') NOT NULL DEFAULT 'CURRENT',
    `lastReviewedAt` DATETIME(3) NULL,
    `lastReviewedById` VARCHAR(191) NULL,
    `reviewDueAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StudyProgram_code_key`(`code`),
    UNIQUE INDEX `StudyProgram_slug_key`(`slug`),
    INDEX `StudyProgram_contentOwnerId_reviewDueAt_idx`(`contentOwnerId`, `reviewDueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudyProgramTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `studyProgramId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `vision` LONGTEXT NULL,
    `mission` LONGTEXT NULL,
    `objectives` LONGTEXT NULL,
    `graduateProfile` LONGTEXT NULL,
    `careerProspects` LONGTEXT NULL,
    `learningOutcomes` LONGTEXT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `StudyProgramTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `StudyProgramTranslation_studyProgramId_locale_key`(`studyProgramId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lecturer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `nidn` VARCHAR(191) NULL,
    `nip` VARCHAR(191) NULL,
    `orcid` VARCHAR(191) NULL,
    `googleScholarUrl` VARCHAR(191) NULL,
    `sintaUrl` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `photoMediaId` VARCHAR(191) NULL,
    `studyProgramId` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Lecturer_slug_key`(`slug`),
    UNIQUE INDEX `Lecturer_nidn_key`(`nidn`),
    UNIQUE INDEX `Lecturer_nip_key`(`nip`),
    UNIQUE INDEX `Lecturer_orcid_key`(`orcid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LecturerTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `lecturerId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `position` VARCHAR(191) NULL,
    `expertise` VARCHAR(191) NULL,
    `bio` LONGTEXT NULL,
    `officeHours` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `LecturerTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `LecturerTranslation_lecturerId_locale_key`(`lecturerId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Staff` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `nip` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `photoMediaId` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Staff_slug_key`(`slug`),
    UNIQUE INDEX `Staff_nip_key`(`nip`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `position` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `StaffTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `StaffTranslation_staffId_locale_key`(`staffId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Research` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `publicationType` VARCHAR(191) NULL,
    `doi` VARCHAR(191) NULL,
    `repositoryUrl` VARCHAR(191) NULL,
    `publisher` VARCHAR(191) NULL,
    `journal` VARCHAR(191) NULL,
    `volume` VARCHAR(191) NULL,
    `issue` VARCHAR(191) NULL,
    `pages` VARCHAR(191) NULL,
    `publicationDate` DATETIME(3) NULL,
    `language` ENUM('id', 'en', 'ar') NULL,
    `peerReviewed` BOOLEAN NOT NULL DEFAULT false,
    `documentUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Research_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResearchTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `researchId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `abstract` TEXT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `ResearchTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `ResearchTranslation_researchId_locale_key`(`researchId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityService` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `location` VARCHAR(191) NULL,
    `documentUrl` VARCHAR(191) NULL,

    UNIQUE INDEX `CommunityService_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityServiceTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `communityServiceId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `CommunityServiceTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `CommunityServiceTranslation_communityServiceId_locale_key`(`communityServiceId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LecturerResearch` (
    `lecturerId` VARCHAR(191) NOT NULL,
    `researchId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`lecturerId`, `researchId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LecturerCommunityService` (
    `lecturerId` VARCHAR(191) NOT NULL,
    `communityServiceId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`lecturerId`, `communityServiceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LecturerPost` (
    `lecturerId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`lecturerId`, `postId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudyProgramPost` (
    `studyProgramId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`studyProgramId`, `postId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Unit` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `type` ENUM('PUSAT_STUDI', 'LABORATORIUM', 'ORGANISASI_MAHASISWA', 'LEMBAGA') NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `externalUrl` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `contentOwnerId` VARCHAR(191) NULL,
    `governanceStatus` ENUM('CURRENT', 'REVIEW_DUE', 'STALE', 'EXPIRED', 'ARCHIVED') NOT NULL DEFAULT 'CURRENT',
    `lastReviewedAt` DATETIME(3) NULL,
    `lastReviewedById` VARCHAR(191) NULL,
    `reviewDueAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Unit_slug_key`(`slug`),
    INDEX `Unit_contentOwnerId_reviewDueAt_idx`(`contentOwnerId`, `reviewDueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UnitTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `unitId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `UnitTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `UnitTranslation_unitId_locale_key`(`unitId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Service` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `category` ENUM('AKADEMIK', 'LABORATORIUM', 'UMUM') NOT NULL,
    `url` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 1,
    `contentOwnerId` VARCHAR(191) NULL,
    `governanceStatus` ENUM('CURRENT', 'REVIEW_DUE', 'STALE', 'EXPIRED', 'ARCHIVED') NOT NULL DEFAULT 'CURRENT',
    `lastReviewedAt` DATETIME(3) NULL,
    `lastReviewedById` VARCHAR(191) NULL,
    `reviewDueAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Service_slug_key`(`slug`),
    INDEX `Service_contentOwnerId_reviewDueAt_idx`(`contentOwnerId`, `reviewDueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `ServiceTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `ServiceTranslation_serviceId_locale_key`(`serviceId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Partnership` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `partnerName` VARCHAR(191) NOT NULL,
    `level` ENUM('INTERNASIONAL', 'NASIONAL', 'LOKAL') NOT NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `documentUrl` VARCHAR(191) NULL,
    `websiteUrl` VARCHAR(191) NULL,
    `logoMediaId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Partnership_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnershipTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `partnershipId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `category` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `PartnershipTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `PartnershipTranslation_partnershipId_locale_key`(`partnershipId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Scholarship` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `registrationUrl` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Scholarship_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScholarshipTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `scholarshipId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `ScholarshipTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `ScholarshipTranslation_scholarshipId_locale_key`(`scholarshipId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Achievement` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `studentName` VARCHAR(191) NOT NULL,
    `level` ENUM('INTERNASIONAL', 'NASIONAL', 'REGIONAL', 'LOKAL') NOT NULL,
    `achievedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Achievement_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AchievementTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `achievementId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `AchievementTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `AchievementTranslation_achievementId_locale_key`(`achievementId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentActivity` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NULL,

    UNIQUE INDEX `StudentActivity_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentActivityTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `studentActivityId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `StudentActivityTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `StudentActivityTranslation_studentActivityId_locale_key`(`studentActivityId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityImage` (
    `id` VARCHAR(191) NOT NULL,
    `studentActivityId` VARCHAR(191) NOT NULL,
    `mediaId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `ActivityImage_studentActivityId_mediaId_key`(`studentActivityId`, `mediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `storageClass` ENUM('PUBLIC', 'PRIVATE', 'PPKS_PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `publishedAt` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `contentOwnerId` VARCHAR(191) NULL,
    `governanceStatus` ENUM('CURRENT', 'REVIEW_DUE', 'STALE', 'EXPIRED', 'ARCHIVED') NOT NULL DEFAULT 'CURRENT',
    `lastReviewedAt` DATETIME(3) NULL,
    `lastReviewedById` VARCHAR(191) NULL,
    `reviewDueAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Document_slug_key`(`slug`),
    INDEX `Document_contentOwnerId_reviewDueAt_idx`(`contentOwnerId`, `reviewDueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `DocumentTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `DocumentTranslation_documentId_locale_key`(`documentId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Album` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `coverMediaId` VARCHAR(191) NULL,
    `eventDate` DATETIME(3) NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Album_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AlbumTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `albumId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `AlbumTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `AlbumTranslation_albumId_locale_key`(`albumId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AlbumPhoto` (
    `id` VARCHAR(191) NOT NULL,
    `albumId` VARCHAR(191) NOT NULL,
    `mediaId` VARCHAR(191) NOT NULL,
    `caption` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `AlbumPhoto_albumId_mediaId_key`(`albumId`, `mediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudyProgramAlbum` (
    `studyProgramId` VARCHAR(191) NOT NULL,
    `albumId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`studyProgramId`, `albumId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MenuItem` (
    `id` VARCHAR(191) NOT NULL,
    `location` ENUM('CONTENT_BAR', 'TOPBAR', 'HEADER', 'FOOTER') NOT NULL,
    `url` VARCHAR(191) NULL,
    `pageId` VARCHAR(191) NULL,
    `parentId` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,

    INDEX `MenuItem_location_order_idx`(`location`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MenuItemTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `menuItemId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `MenuItemTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `MenuItemTranslation_menuItemId_locale_key`(`menuItemId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HomeSlider` (
    `id` VARCHAR(191) NOT NULL,
    `imageMediaId` VARCHAR(191) NOT NULL,
    `ctaUrl` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HomeSliderTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `homeSliderId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `title` VARCHAR(191) NULL,
    `subtitle` VARCHAR(191) NULL,
    `ctaLabel` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `HomeSliderTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `HomeSliderTranslation_homeSliderId_locale_key`(`homeSliderId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HomeSection` (
    `id` VARCHAR(191) NOT NULL,
    `key` ENUM('HERO', 'QUICKLINK', 'DEAN', 'STATS', 'NEWS', 'ANNOUNCEMENT', 'PRODI', 'PARTNERSHIP', 'VIDEO', 'AGENDA', 'TESTIMONIAL', 'COLUMN', 'CTA') NOT NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL DEFAULT 0,
    `itemLimit` INTEGER NOT NULL DEFAULT 4,
    `ctaUrl` VARCHAR(191) NULL,
    `backgroundMediaId` VARCHAR(191) NULL,

    UNIQUE INDEX `HomeSection_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HomeSectionTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `homeSectionId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` VARCHAR(191) NULL,
    `ctaLabel` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `HomeSectionTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `HomeSectionTranslation_homeSectionId_locale_key`(`homeSectionId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Statistic` (
    `id` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StatisticTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `statisticId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `StatisticTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `StatisticTranslation_statisticId_locale_key`(`statisticId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuickLink` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuickLinkTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `quickLinkId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `QuickLinkTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `QuickLinkTranslation_quickLinkId_locale_key`(`quickLinkId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExternalLink` (
    `id` VARCHAR(191) NOT NULL,
    `category` ENUM('TERKAIT', 'JURNAL') NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExternalLinkTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `externalLinkId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `ExternalLinkTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `ExternalLinkTranslation_externalLinkId_locale_key`(`externalLinkId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteSetting` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `deanName` VARCHAR(191) NULL,
    `deanPhotoId` VARCHAR(191) NULL,
    `videoUrl` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `facebookUrl` VARCHAR(191) NULL,
    `instagramUrl` VARCHAR(191) NULL,
    `youtubeUrl` VARCHAR(191) NULL,
    `xUrl` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `contentOwnerId` VARCHAR(191) NULL,
    `governanceStatus` ENUM('CURRENT', 'REVIEW_DUE', 'STALE', 'EXPIRED', 'ARCHIVED') NOT NULL DEFAULT 'CURRENT',
    `lastReviewedAt` DATETIME(3) NULL,
    `lastReviewedById` VARCHAR(191) NULL,
    `reviewDueAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SiteSetting_contentOwnerId_reviewDueAt_idx`(`contentOwnerId`, `reviewDueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteSettingTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `siteSettingId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `facultyName` VARCHAR(191) NOT NULL,
    `tagline` VARCHAR(191) NULL,
    `address1` TEXT NULL,
    `address2` TEXT NULL,
    `deanPosition` VARCHAR(191) NULL,
    `deanMessage` TEXT NULL,
    `videoTitle` VARCHAR(191) NULL,
    `videoDesc` TEXT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `SiteSettingTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `SiteSettingTranslation_siteSettingId_locale_key`(`siteSettingId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NULL,
    `registrationUrl` VARCHAR(191) NULL,
    `sourceBookingId` VARCHAR(191) NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL DEFAULT 1,
    `contentOwnerId` VARCHAR(191) NULL,
    `governanceStatus` ENUM('CURRENT', 'REVIEW_DUE', 'STALE', 'EXPIRED', 'ARCHIVED') NOT NULL DEFAULT 'CURRENT',
    `lastReviewedAt` DATETIME(3) NULL,
    `lastReviewedById` VARCHAR(191) NULL,
    `reviewDueAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Event_slug_key`(`slug`),
    UNIQUE INDEX `Event_sourceBookingId_key`(`sourceBookingId`),
    INDEX `Event_contentOwnerId_reviewDueAt_idx`(`contentOwnerId`, `reviewDueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `location` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `EventTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `EventTranslation_eventId_locale_key`(`eventId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Faq` (
    `id` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `contentOwnerId` VARCHAR(191) NULL,
    `governanceStatus` ENUM('CURRENT', 'REVIEW_DUE', 'STALE', 'EXPIRED', 'ARCHIVED') NOT NULL DEFAULT 'CURRENT',
    `lastReviewedAt` DATETIME(3) NULL,
    `lastReviewedById` VARCHAR(191) NULL,
    `reviewDueAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Faq_contentOwnerId_reviewDueAt_idx`(`contentOwnerId`, `reviewDueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FaqTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `faqId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `category` VARCHAR(191) NULL,
    `question` VARCHAR(191) NOT NULL,
    `answer` LONGTEXT NOT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `FaqTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `FaqTranslation_faqId_locale_key`(`faqId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Testimonial` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `photoMediaId` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TestimonialTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `testimonialId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `currentRole` VARCHAR(191) NULL,
    `quote` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `TestimonialTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `TestimonialTranslation_testimonialId_locale_key`(`testimonialId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NULL,
    `message` TEXT NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL DEFAULT 'id',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ticket` (
    `id` VARCHAR(191) NOT NULL,
    `ticketNumber` VARCHAR(191) NOT NULL,
    `trackingTokenHash` VARCHAR(191) NOT NULL,
    `category` ENUM('AKADEMIK', 'FASILITAS', 'LAYANAN', 'KEUANGAN', 'PELECEHAN_SEKSUAL', 'LAINNYA') NOT NULL,
    `priority` ENUM('RENDAH', 'NORMAL', 'TINGGI', 'DARURAT') NOT NULL DEFAULT 'NORMAL',
    `status` ENUM('BARU', 'DIPROSES', 'MENUNGGU_PELAPOR', 'SELESAI', 'DITUTUP') NOT NULL DEFAULT 'BARU',
    `subjectCiphertext` LONGTEXT NULL,
    `descriptionCiphertext` LONGTEXT NOT NULL,
    `reporterIdentityCiphertext` LONGTEXT NULL,
    `resolutionCiphertext` LONGTEXT NULL,
    `encryptionNonce` VARCHAR(191) NULL,
    `encryptionTag` VARCHAR(191) NULL,
    `keyVersion` INTEGER NULL,
    `assigneeId` VARCHAR(191) NULL,
    `responseDueAt` DATETIME(3) NULL,
    `resolutionDueAt` DATETIME(3) NULL,
    `firstRespondedAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `pausedAt` DATETIME(3) NULL,
    `totalPausedSeconds` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Ticket_ticketNumber_key`(`ticketNumber`),
    UNIQUE INDEX `Ticket_trackingTokenHash_key`(`trackingTokenHash`),
    INDEX `Ticket_category_status_createdAt_idx`(`category`, `status`, `createdAt`),
    INDEX `Ticket_assigneeId_status_idx`(`assigneeId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketReply` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NULL,
    `bodyCiphertext` LONGTEXT NOT NULL,
    `encryptionNonce` VARCHAR(191) NULL,
    `encryptionTag` VARCHAR(191) NULL,
    `keyVersion` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TicketReply_ticketId_createdAt_idx`(`ticketId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `storageClass` ENUM('PUBLIC', 'PRIVATE', 'PPKS_PRIVATE') NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `checksumSha256` VARCHAR(191) NOT NULL,
    `encryptionNonce` VARCHAR(191) NULL,
    `encryptionTag` VARCHAR(191) NULL,
    `keyVersion` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TicketAttachment_storageKey_key`(`storageKey`),
    INDEX `TicketAttachment_ticketId_idx`(`ticketId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketAccessLog` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` ENUM('VIEW', 'EXPORT', 'REPLY', 'ASSIGN', 'STATUS_CHANGE', 'ATTACHMENT_DOWNLOAD') NOT NULL,
    `allowed` BOOLEAN NOT NULL,
    `reasonCode` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TicketAccessLog_ticketId_createdAt_idx`(`ticketId`, `createdAt`),
    INDEX `TicketAccessLog_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketHistory` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `event` ENUM('CREATED', 'ASSIGNED', 'REPLIED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'PAUSED', 'RESUMED', 'CLOSED') NOT NULL,
    `fromStatus` ENUM('BARU', 'DIPROSES', 'MENUNGGU_PELAPOR', 'SELESAI', 'DITUTUP') NULL,
    `toStatus` ENUM('BARU', 'DIPROSES', 'MENUNGGU_PELAPOR', 'SELESAI', 'DITUTUP') NULL,
    `fromPriority` ENUM('RENDAH', 'NORMAL', 'TINGGI', 'DARURAT') NULL,
    `toPriority` ENUM('RENDAH', 'NORMAL', 'TINGGI', 'DARURAT') NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TicketHistory_ticketId_createdAt_idx`(`ticketId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Room` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `capacity` INTEGER NOT NULL,
    `bufferMinutes` INTEGER NOT NULL DEFAULT 30,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `contentOwnerId` VARCHAR(191) NULL,
    `governanceStatus` ENUM('CURRENT', 'REVIEW_DUE', 'STALE', 'EXPIRED', 'ARCHIVED') NOT NULL DEFAULT 'CURRENT',
    `lastReviewedAt` DATETIME(3) NULL,
    `lastReviewedById` VARCHAR(191) NULL,
    `reviewDueAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Room_slug_key`(`slug`),
    INDEX `Room_contentOwnerId_reviewDueAt_idx`(`contentOwnerId`, `reviewDueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `facilities` TEXT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `RoomTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `RoomTranslation_roomId_locale_key`(`roomId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomOperatingHour` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `opensAtMinute` INTEGER NOT NULL,
    `closesAtMinute` INTEGER NOT NULL,

    UNIQUE INDEX `RoomOperatingHour_roomId_dayOfWeek_key`(`roomId`, `dayOfWeek`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomBlackout` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RoomBlackout_roomId_startTime_endTime_idx`(`roomId`, `startTime`, `endTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` VARCHAR(191) NOT NULL,
    `bookingNumber` VARCHAR(191) NOT NULL,
    `trackingTokenHash` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `requesterName` VARCHAR(191) NOT NULL,
    `requesterEmail` VARCHAR(191) NOT NULL,
    `requesterPhone` VARCHAR(191) NULL,
    `organization` VARCHAR(191) NULL,
    `purpose` TEXT NOT NULL,
    `participantCount` INTEGER NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `status` ENUM('MENUNGGU', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN', 'SELESAI') NOT NULL DEFAULT 'MENUNGGU',
    `version` INTEGER NOT NULL DEFAULT 1,
    `applicationStorageKey` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancelReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Booking_bookingNumber_key`(`bookingNumber`),
    UNIQUE INDEX `Booking_trackingTokenHash_key`(`trackingTokenHash`),
    INDEX `Booking_roomId_status_startTime_endTime_idx`(`roomId`, `status`, `startTime`, `endTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingHistory` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `fromStatus` ENUM('MENUNGGU', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN', 'SELESAI') NULL,
    `toStatus` ENUM('MENUNGGU', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN', 'SELESAI') NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BookingHistory_bookingId_createdAt_idx`(`bookingId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnnualSequence` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('TICKET', 'BOOKING') NOT NULL,
    `year` INTEGER NOT NULL,
    `value` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AnnualSequence_kind_year_key`(`kind`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Holiday` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Holiday_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `action` ENUM('CREATE', 'UPDATE', 'PUBLISH', 'ARCHIVE', 'LOGIN', 'LOGIN_FAILED', 'VIEW_SENSITIVE', 'EXPORT', 'CHANGE_ROLE', 'CHANGE_PASSWORD') NOT NULL,
    `resourceType` VARCHAR(191) NOT NULL,
    `resourceId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityLog_actorId_createdAt_idx`(`actorId`, `createdAt`),
    INDEX `ActivityLog_resourceType_resourceId_createdAt_idx`(`resourceType`, `resourceId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentRevision` (
    `id` VARCHAR(191) NOT NULL,
    `resourceType` VARCHAR(191) NOT NULL,
    `resourceId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NULL,
    `scopeKey` VARCHAR(191) NOT NULL DEFAULT 'root',
    `version` INTEGER NOT NULL,
    `snapshotJson` JSON NOT NULL,
    `changeSummary` VARCHAR(191) NULL,
    `actorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContentRevision_resourceType_resourceId_version_idx`(`resourceType`, `resourceId`, `version`),
    UNIQUE INDEX `ContentRevision_resourceType_resourceId_scopeKey_version_key`(`resourceType`, `resourceId`, `scopeKey`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveyDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SurveyDefinition_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveyQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `definitionId` VARCHAR(191) NOT NULL,
    `prompt` TEXT NOT NULL,
    `type` ENUM('SHORT_TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'RATING') NOT NULL,
    `options` JSON NULL,
    `isRequired` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveySubmission` (
    `id` VARCHAR(191) NOT NULL,
    `definitionId` VARCHAR(191) NOT NULL,
    `definitionVersion` INTEGER NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL DEFAULT 'id',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveyAnswer` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,

    UNIQUE INDEX `SurveyAnswer_submissionId_questionId_key`(`submissionId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RateLimitBucket` (
    `id` VARCHAR(191) NOT NULL,
    `keyHash` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `windowStart` DATETIME(3) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `blockedUntil` DATETIME(3) NULL,

    UNIQUE INDEX `RateLimitBucket_keyHash_scope_windowStart_key`(`keyHash`, `scope`, `windowStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationOutbox` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL DEFAULT 'id',
    `template` VARCHAR(191) NOT NULL,
    `payload` JSON NULL,
    `payloadEncrypted` BOOLEAN NOT NULL DEFAULT false,
    `payloadCiphertext` LONGTEXT NULL,
    `encryptionNonce` VARCHAR(191) NULL,
    `encryptionTag` VARCHAR(191) NULL,
    `keyVersion` INTEGER NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sentAt` DATETIME(3) NULL,
    `lastError` VARCHAR(191) NULL,
    `lockedAt` DATETIME(3) NULL,
    `lockedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NotificationOutbox_idempotencyKey_key`(`idempotencyKey`),
    INDEX `NotificationOutbox_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Redirect` (
    `id` VARCHAR(191) NOT NULL,
    `sourcePath` VARCHAR(191) NOT NULL,
    `destinationPath` VARCHAR(191) NOT NULL,
    `statusCode` INTEGER NOT NULL DEFAULT 301,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `hitCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Redirect_sourcePath_key`(`sourcePath`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GlossaryTerm` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `GlossaryTerm_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GlossaryTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `glossaryTermId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `term` VARCHAR(191) NOT NULL,
    `definition` TEXT NULL,

    INDEX `GlossaryTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `GlossaryTranslation_glossaryTermId_locale_key`(`glossaryTermId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteAlert` (
    `id` VARCHAR(191) NOT NULL,
    `severity` ENUM('INFO', 'WARNING', 'CRITICAL') NOT NULL,
    `audience` ENUM('ALL', 'PUBLIC', 'ADMIN') NOT NULL DEFAULT 'PUBLIC',
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NULL,
    `isDismissible` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SiteAlert_isActive_startsAt_endsAt_idx`(`isActive`, `startsAt`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteAlertTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `siteAlertId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `linkLabel` VARCHAR(191) NULL,
    `linkUrl` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `SiteAlertTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `SiteAlertTranslation_siteAlertId_locale_key`(`siteAlertId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceEndpoint` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isPublic` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `ServiceEndpoint_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceIncident` (
    `id` VARCHAR(191) NOT NULL,
    `serviceEndpointId` VARCHAR(191) NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `status` ENUM('INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED') NOT NULL DEFAULT 'INVESTIGATING',
    `startedAt` DATETIME(3) NOT NULL,
    `resolvedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceIncidentTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `serviceIncidentId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `summary` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `ServiceIncidentTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `ServiceIncidentTranslation_serviceIncidentId_locale_key`(`serviceIncidentId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceIncidentUpdate` (
    `id` VARCHAR(191) NOT NULL,
    `serviceIncidentId` VARCHAR(191) NOT NULL,
    `status` ENUM('INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED') NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL DEFAULT 'id',
    `message` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PrivacyNotice` (
    `id` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `effectiveAt` DATETIME(3) NOT NULL,
    `retiredAt` DATETIME(3) NULL,
    `isCurrent` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PrivacyNotice_version_key`(`version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PrivacyNoticeTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `privacyNoticeId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `PrivacyNoticeTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `PrivacyNoticeTranslation_privacyNoticeId_locale_key`(`privacyNoticeId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConsentRecord` (
    `id` VARCHAR(191) NOT NULL,
    `privacyNoticeId` VARCHAR(191) NOT NULL,
    `subjectHash` VARCHAR(191) NOT NULL,
    `purpose` VARCHAR(191) NOT NULL,
    `granted` BOOLEAN NOT NULL,
    `userId` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ConsentRecord_subjectHash_purpose_idx`(`subjectHash`, `purpose`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DataSubjectRequest` (
    `id` VARCHAR(191) NOT NULL,
    `requestNumber` VARCHAR(191) NOT NULL,
    `trackingTokenHash` VARCHAR(191) NOT NULL,
    `type` ENUM('ACCESS', 'CORRECTION', 'ERASURE', 'RESTRICTION', 'OBJECTION') NOT NULL,
    `status` ENUM('RECEIVED', 'VERIFYING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'RECEIVED',
    `verificationState` ENUM('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `requesterCiphertext` LONGTEXT NOT NULL,
    `requestCiphertext` LONGTEXT NOT NULL,
    `assigneeId` VARCHAR(191) NULL,
    `resolutionCiphertext` LONGTEXT NULL,
    `dueAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,

    UNIQUE INDEX `DataSubjectRequest_requestNumber_key`(`requestNumber`),
    UNIQUE INDEX `DataSubjectRequest_trackingTokenHash_key`(`trackingTokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DataIncident` (
    `id` VARCHAR(191) NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `discoveredAt` DATETIME(3) NOT NULL,
    `systemsAffected` JSON NOT NULL,
    `dataCategories` JSON NOT NULL,
    `containmentCiphertext` LONGTEXT NULL,
    `summaryCiphertext` LONGTEXT NOT NULL,
    `status` ENUM('OPEN', 'CONTAINED', 'INVESTIGATING', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `ownerId` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DataExportLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `resourceType` VARCHAR(191) NOT NULL,
    `resourceId` VARCHAR(191) NULL,
    `purpose` VARCHAR(191) NOT NULL,
    `recordCount` INTEGER NOT NULL,
    `storageKey` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NULL,
    `downloadedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DataExportLog_actorId_createdAt_idx`(`actorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RetentionPolicy` (
    `id` VARCHAR(191) NOT NULL,
    `resourceType` VARCHAR(191) NOT NULL,
    `legalBasis` TEXT NOT NULL,
    `activeDays` INTEGER NULL,
    `archiveDays` INTEGER NULL,
    `disposition` ENUM('DELETE', 'ANONYMIZE', 'HOLD') NOT NULL,
    `legalHold` BOOLEAN NOT NULL DEFAULT false,
    `approverId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rationale` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RetentionPolicy_resourceType_key`(`resourceType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccessibilityIssue` (
    `id` VARCHAR(191) NOT NULL,
    `route` VARCHAR(191) NOT NULL,
    `wcagCriterion` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `summary` VARCHAR(191) NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'FIXED', 'VERIFIED', 'ACCEPTED_RISK') NOT NULL DEFAULT 'OPEN',
    `evidence` JSON NULL,
    `ownerId` VARCHAR(191) NULL,
    `targetDate` DATETIME(3) NULL,
    `fixedAt` DATETIME(3) NULL,
    `retestResult` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `resolvedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccessibilityRequest` (
    `id` VARCHAR(191) NOT NULL,
    `requestNumber` VARCHAR(191) NOT NULL,
    `trackingTokenHash` VARCHAR(191) NOT NULL,
    `status` ENUM('RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'RECEIVED',
    `requesterCiphertext` LONGTEXT NOT NULL,
    `requestedFormat` VARCHAR(191) NOT NULL,
    `resourcePath` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    UNIQUE INDEX `AccessibilityRequest_requestNumber_key`(`requestNumber`),
    UNIQUE INDEX `AccessibilityRequest_trackingTokenHash_key`(`trackingTokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdmissionInfo` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `sourceUrl` VARCHAR(191) NOT NULL,
    `lastReviewedAt` DATETIME(3) NOT NULL,
    `reviewDueAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `AdmissionInfo_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdmissionInfoTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `admissionInfoId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `status` ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'STALE') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` INTEGER NOT NULL DEFAULT 1,
    `translatorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `AdmissionInfoTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `AdmissionInfoTranslation_admissionInfoId_locale_key`(`admissionInfoId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageFeedback` (
    `id` VARCHAR(191) NOT NULL,
    `pageType` VARCHAR(191) NOT NULL,
    `pageId` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL,
    `helpful` BOOLEAN NOT NULL,
    `reason` VARCHAR(191) NULL,
    `comment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PageFeedback_pageType_pageId_locale_idx`(`pageType`, `pageId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscriber` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `locale` ENUM('id', 'en', 'ar') NOT NULL DEFAULT 'id',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `unsubscribeTokenHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Subscriber_email_key`(`email`),
    UNIQUE INDEX `Subscriber_unsubscribeTokenHash_key`(`unsubscribeTokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Authenticator` ADD CONSTRAINT `Authenticator_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_coverMediaId_fkey` FOREIGN KEY (`coverMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostTranslation` ADD CONSTRAINT `PostTranslation_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryTranslation` ADD CONSTRAINT `CategoryTranslation_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagTranslation` ADD CONSTRAINT `TagTranslation_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostTag` ADD CONSTRAINT `PostTag_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostTag` ADD CONSTRAINT `PostTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Page` ADD CONSTRAINT `Page_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Page`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Page` ADD CONSTRAINT `Page_heroMediaId_fkey` FOREIGN KEY (`heroMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PageTranslation` ADD CONSTRAINT `PageTranslation_pageId_fkey` FOREIGN KEY (`pageId`) REFERENCES `Page`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Media` ADD CONSTRAINT `Media_uploaderId_fkey` FOREIGN KEY (`uploaderId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyProgram` ADD CONSTRAINT `StudyProgram_logoMediaId_fkey` FOREIGN KEY (`logoMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyProgram` ADD CONSTRAINT `StudyProgram_curriculumDocumentId_fkey` FOREIGN KEY (`curriculumDocumentId`) REFERENCES `Document`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyProgram` ADD CONSTRAINT `StudyProgram_brochureDocumentId_fkey` FOREIGN KEY (`brochureDocumentId`) REFERENCES `Document`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyProgramTranslation` ADD CONSTRAINT `StudyProgramTranslation_studyProgramId_fkey` FOREIGN KEY (`studyProgramId`) REFERENCES `StudyProgram`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lecturer` ADD CONSTRAINT `Lecturer_photoMediaId_fkey` FOREIGN KEY (`photoMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lecturer` ADD CONSTRAINT `Lecturer_studyProgramId_fkey` FOREIGN KEY (`studyProgramId`) REFERENCES `StudyProgram`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LecturerTranslation` ADD CONSTRAINT `LecturerTranslation_lecturerId_fkey` FOREIGN KEY (`lecturerId`) REFERENCES `Lecturer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_photoMediaId_fkey` FOREIGN KEY (`photoMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffTranslation` ADD CONSTRAINT `StaffTranslation_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResearchTranslation` ADD CONSTRAINT `ResearchTranslation_researchId_fkey` FOREIGN KEY (`researchId`) REFERENCES `Research`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityServiceTranslation` ADD CONSTRAINT `CommunityServiceTranslation_communityServiceId_fkey` FOREIGN KEY (`communityServiceId`) REFERENCES `CommunityService`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LecturerResearch` ADD CONSTRAINT `LecturerResearch_lecturerId_fkey` FOREIGN KEY (`lecturerId`) REFERENCES `Lecturer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LecturerResearch` ADD CONSTRAINT `LecturerResearch_researchId_fkey` FOREIGN KEY (`researchId`) REFERENCES `Research`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LecturerCommunityService` ADD CONSTRAINT `LecturerCommunityService_lecturerId_fkey` FOREIGN KEY (`lecturerId`) REFERENCES `Lecturer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LecturerCommunityService` ADD CONSTRAINT `LecturerCommunityService_communityServiceId_fkey` FOREIGN KEY (`communityServiceId`) REFERENCES `CommunityService`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LecturerPost` ADD CONSTRAINT `LecturerPost_lecturerId_fkey` FOREIGN KEY (`lecturerId`) REFERENCES `Lecturer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LecturerPost` ADD CONSTRAINT `LecturerPost_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyProgramPost` ADD CONSTRAINT `StudyProgramPost_studyProgramId_fkey` FOREIGN KEY (`studyProgramId`) REFERENCES `StudyProgram`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyProgramPost` ADD CONSTRAINT `StudyProgramPost_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UnitTranslation` ADD CONSTRAINT `UnitTranslation_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `Unit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceTranslation` ADD CONSTRAINT `ServiceTranslation_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partnership` ADD CONSTRAINT `Partnership_logoMediaId_fkey` FOREIGN KEY (`logoMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnershipTranslation` ADD CONSTRAINT `PartnershipTranslation_partnershipId_fkey` FOREIGN KEY (`partnershipId`) REFERENCES `Partnership`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScholarshipTranslation` ADD CONSTRAINT `ScholarshipTranslation_scholarshipId_fkey` FOREIGN KEY (`scholarshipId`) REFERENCES `Scholarship`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AchievementTranslation` ADD CONSTRAINT `AchievementTranslation_achievementId_fkey` FOREIGN KEY (`achievementId`) REFERENCES `Achievement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentActivityTranslation` ADD CONSTRAINT `StudentActivityTranslation_studentActivityId_fkey` FOREIGN KEY (`studentActivityId`) REFERENCES `StudentActivity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityImage` ADD CONSTRAINT `ActivityImage_studentActivityId_fkey` FOREIGN KEY (`studentActivityId`) REFERENCES `StudentActivity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityImage` ADD CONSTRAINT `ActivityImage_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentTranslation` ADD CONSTRAINT `DocumentTranslation_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Album` ADD CONSTRAINT `Album_coverMediaId_fkey` FOREIGN KEY (`coverMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlbumTranslation` ADD CONSTRAINT `AlbumTranslation_albumId_fkey` FOREIGN KEY (`albumId`) REFERENCES `Album`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlbumPhoto` ADD CONSTRAINT `AlbumPhoto_albumId_fkey` FOREIGN KEY (`albumId`) REFERENCES `Album`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlbumPhoto` ADD CONSTRAINT `AlbumPhoto_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyProgramAlbum` ADD CONSTRAINT `StudyProgramAlbum_studyProgramId_fkey` FOREIGN KEY (`studyProgramId`) REFERENCES `StudyProgram`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyProgramAlbum` ADD CONSTRAINT `StudyProgramAlbum_albumId_fkey` FOREIGN KEY (`albumId`) REFERENCES `Album`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MenuItem` ADD CONSTRAINT `MenuItem_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `MenuItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MenuItemTranslation` ADD CONSTRAINT `MenuItemTranslation_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeSlider` ADD CONSTRAINT `HomeSlider_imageMediaId_fkey` FOREIGN KEY (`imageMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeSliderTranslation` ADD CONSTRAINT `HomeSliderTranslation_homeSliderId_fkey` FOREIGN KEY (`homeSliderId`) REFERENCES `HomeSlider`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeSection` ADD CONSTRAINT `HomeSection_backgroundMediaId_fkey` FOREIGN KEY (`backgroundMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeSectionTranslation` ADD CONSTRAINT `HomeSectionTranslation_homeSectionId_fkey` FOREIGN KEY (`homeSectionId`) REFERENCES `HomeSection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatisticTranslation` ADD CONSTRAINT `StatisticTranslation_statisticId_fkey` FOREIGN KEY (`statisticId`) REFERENCES `Statistic`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuickLinkTranslation` ADD CONSTRAINT `QuickLinkTranslation_quickLinkId_fkey` FOREIGN KEY (`quickLinkId`) REFERENCES `QuickLink`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalLinkTranslation` ADD CONSTRAINT `ExternalLinkTranslation_externalLinkId_fkey` FOREIGN KEY (`externalLinkId`) REFERENCES `ExternalLink`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SiteSetting` ADD CONSTRAINT `SiteSetting_deanPhotoId_fkey` FOREIGN KEY (`deanPhotoId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SiteSettingTranslation` ADD CONSTRAINT `SiteSettingTranslation_siteSettingId_fkey` FOREIGN KEY (`siteSettingId`) REFERENCES `SiteSetting`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_sourceBookingId_fkey` FOREIGN KEY (`sourceBookingId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventTranslation` ADD CONSTRAINT `EventTranslation_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FaqTranslation` ADD CONSTRAINT `FaqTranslation_faqId_fkey` FOREIGN KEY (`faqId`) REFERENCES `Faq`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Testimonial` ADD CONSTRAINT `Testimonial_photoMediaId_fkey` FOREIGN KEY (`photoMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TestimonialTranslation` ADD CONSTRAINT `TestimonialTranslation_testimonialId_fkey` FOREIGN KEY (`testimonialId`) REFERENCES `Testimonial`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketReply` ADD CONSTRAINT `TicketReply_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketReply` ADD CONSTRAINT `TicketReply_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketAttachment` ADD CONSTRAINT `TicketAttachment_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketAccessLog` ADD CONSTRAINT `TicketAccessLog_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketAccessLog` ADD CONSTRAINT `TicketAccessLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketHistory` ADD CONSTRAINT `TicketHistory_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomTranslation` ADD CONSTRAINT `RoomTranslation_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomOperatingHour` ADD CONSTRAINT `RoomOperatingHour_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomBlackout` ADD CONSTRAINT `RoomBlackout_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingHistory` ADD CONSTRAINT `BookingHistory_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyQuestion` ADD CONSTRAINT `SurveyQuestion_definitionId_fkey` FOREIGN KEY (`definitionId`) REFERENCES `SurveyDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveySubmission` ADD CONSTRAINT `SurveySubmission_definitionId_fkey` FOREIGN KEY (`definitionId`) REFERENCES `SurveyDefinition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyAnswer` ADD CONSTRAINT `SurveyAnswer_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `SurveySubmission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyAnswer` ADD CONSTRAINT `SurveyAnswer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `SurveyQuestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GlossaryTranslation` ADD CONSTRAINT `GlossaryTranslation_glossaryTermId_fkey` FOREIGN KEY (`glossaryTermId`) REFERENCES `GlossaryTerm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SiteAlertTranslation` ADD CONSTRAINT `SiteAlertTranslation_siteAlertId_fkey` FOREIGN KEY (`siteAlertId`) REFERENCES `SiteAlert`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceIncident` ADD CONSTRAINT `ServiceIncident_serviceEndpointId_fkey` FOREIGN KEY (`serviceEndpointId`) REFERENCES `ServiceEndpoint`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceIncidentTranslation` ADD CONSTRAINT `ServiceIncidentTranslation_serviceIncidentId_fkey` FOREIGN KEY (`serviceIncidentId`) REFERENCES `ServiceIncident`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceIncidentUpdate` ADD CONSTRAINT `ServiceIncidentUpdate_serviceIncidentId_fkey` FOREIGN KEY (`serviceIncidentId`) REFERENCES `ServiceIncident`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrivacyNoticeTranslation` ADD CONSTRAINT `PrivacyNoticeTranslation_privacyNoticeId_fkey` FOREIGN KEY (`privacyNoticeId`) REFERENCES `PrivacyNotice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConsentRecord` ADD CONSTRAINT `ConsentRecord_privacyNoticeId_fkey` FOREIGN KEY (`privacyNoticeId`) REFERENCES `PrivacyNotice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdmissionInfoTranslation` ADD CONSTRAINT `AdmissionInfoTranslation_admissionInfoId_fkey` FOREIGN KEY (`admissionInfoId`) REFERENCES `AdmissionInfo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

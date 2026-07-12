let mediaIdCounter = 0;

export interface FixtureMedia {
  id: string;
  storageKey: string;
  storageClass: "PUBLIC" | "PRIVATE" | "PPKS_PRIVATE";
  checksumSha256: string;
  originalName: string;
  mimeType: string;
  size: number;
  alt: string | null;
  isDecorative: boolean;
  width: number | null;
  height: number | null;
  encryptionNonce: string | null;
  encryptionTag: string | null;
  keyVersion: number | null;
  uploaderId: string | null;
  createdAt: Date;
}

export function createMedia(overrides: Partial<FixtureMedia> = {}): FixtureMedia {
  mediaIdCounter += 1;
  const id = overrides.id ?? `test-media-${mediaIdCounter}`;
  return {
    id,
    storageKey: `uploads/${id}.jpg`,
    storageClass: "PUBLIC",
    checksumSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    originalName: `test-image-${mediaIdCounter}.jpg`,
    mimeType: "image/jpeg",
    size: 102400,
    alt: `Test image ${mediaIdCounter}`,
    isDecorative: false,
    width: 800,
    height: 600,
    encryptionNonce: null,
    encryptionTag: null,
    keyVersion: null,
    uploaderId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

export function createPrivateMedia(overrides: Partial<FixtureMedia> = {}): FixtureMedia {
  return createMedia({ storageClass: "PRIVATE", ...overrides });
}

export function createPPKSMedia(overrides: Partial<FixtureMedia> = {}): FixtureMedia {
  return createMedia({
    storageClass: "PPKS_PRIVATE",
    encryptionNonce: "base64nonceplaceholder",
    encryptionTag: "base64tagplaceholder",
    keyVersion: 1,
    ...overrides,
  });
}

export function resetMediaIdCounter(): void {
  mediaIdCounter = 0;
}

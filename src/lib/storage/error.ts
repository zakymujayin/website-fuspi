const STORAGE_ERROR_MESSAGE = "Unable to process file.";

export class StorageBoundaryError extends Error {
  constructor() {
    super(STORAGE_ERROR_MESSAGE);
    this.name = "StorageBoundaryError";
  }
}

export function storageBoundaryError(): StorageBoundaryError {
  return new StorageBoundaryError();
}

export class PpksAttachmentError extends Error {
  constructor() {
    super("Unable to process protected attachment.");
    this.name = "PpksAttachmentError";
  }
}

export function ppksAttachmentError(): PpksAttachmentError {
  return new PpksAttachmentError();
}

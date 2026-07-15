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

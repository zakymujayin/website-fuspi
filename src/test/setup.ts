import { afterEach } from "vitest";

afterEach(async () => {
  try {
    const user = await import("@/../tests/foundation/fixtures/user");
    user.resetUserIdCounter();
  } catch {}
  try {
    const post = await import("@/../tests/foundation/fixtures/post");
    post.resetPostIdCounter();
  } catch {}
  try {
    const category = await import("@/../tests/foundation/fixtures/category");
    category.resetCategoryIdCounter();
  } catch {}
  try {
    const studyProgram = await import("@/../tests/foundation/fixtures/study-program");
    studyProgram.resetStudyProgramIdCounter();
  } catch {}
  try {
    const media = await import("@/../tests/foundation/fixtures/media");
    media.resetMediaIdCounter();
  } catch {}
  try {
    const page = await import("@/../tests/foundation/fixtures/page");
    page.resetPageIdCounter();
  } catch {}
});

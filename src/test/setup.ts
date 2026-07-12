import { afterEach } from "vitest";

import { resetUserIdCounter } from "@/../tests/foundation/fixtures/user";
import { resetPostIdCounter } from "@/../tests/foundation/fixtures/post";
import { resetCategoryIdCounter } from "@/../tests/foundation/fixtures/category";
import { resetStudyProgramIdCounter } from "@/../tests/foundation/fixtures/study-program";
import { resetMediaIdCounter } from "@/../tests/foundation/fixtures/media";
import { resetPageIdCounter } from "@/../tests/foundation/fixtures/page";

afterEach(() => {
  resetUserIdCounter();
  resetPostIdCounter();
  resetCategoryIdCounter();
  resetStudyProgramIdCounter();
  resetMediaIdCounter();
  resetPageIdCounter();
});

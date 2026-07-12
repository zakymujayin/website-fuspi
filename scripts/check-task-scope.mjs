import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const manifestPath = process.env.TASK_MANIFEST;

if (!manifestPath) {
  console.log("scope-check: TASK_MANIFEST is not set; coordinator/bootstrap mode");
  process.exit(0);
}

if (!existsSync(manifestPath)) {
  console.error(`scope-check: manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest = readFileSync(manifestPath, "utf8");
const match = manifest.match(/allowed_paths:\s*\n((?:\s+- .+\n?)*)/);
const allowed = (match?.[1] ?? "")
  .split("\n")
  .map((line) => line.replace(/^\s+-\s+/, "").trim())
  .filter(Boolean);

if (allowed.length === 0) {
  console.error("scope-check: task manifest has no allowed_paths");
  process.exit(1);
}

const base = process.env.TASK_BASE ?? "HEAD~1";
const changed = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);

const escapeRegex = (value) => value.replace(/[.+^${}()|[\]\\]/g, "\\$&");
const matchesGlob = (file, glob) => {
  const pattern = escapeRegex(glob)
    .replaceAll("**", "__DOUBLE_STAR__")
    .replaceAll("*", "[^/]*")
    .replaceAll("__DOUBLE_STAR__", ".*");
  return new RegExp(`^${pattern}$`).test(file);
};

const outside = changed.filter(
  (file) => !allowed.some((glob) => matchesGlob(file, glob)),
);

if (outside.length > 0) {
  console.error("scope-check: files outside task lease:");
  for (const file of outside) console.error(`- ${file}`);
  process.exit(1);
}

console.log(`scope-check: ${changed.length} changed file(s) are within lease`);

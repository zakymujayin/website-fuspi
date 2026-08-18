import {mkdtemp, mkdir, rm, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {afterEach, describe, expect, it} from "vitest";

import {GET, HEAD} from "@/app/uploads/[...path]/route";

const STORAGE_KEY = `2026/08/${"a".repeat(64)}.webp`;

let root: string | null = null;

async function makeRoot() {
  root = await mkdtemp(path.join(os.tmpdir(), "fuspi-public-upload-route-"));
  process.env.UPLOAD_DIR = root;
  await mkdir(path.join(root, "2026", "08"), {recursive: true});
  return root;
}

function paramsFor(storageKey: string) {
  return {params: Promise.resolve({path: storageKey.split("/")})};
}

afterEach(async () => {
  if (root) await rm(root, {recursive: true, force: true});
  root = null;
  delete process.env.UPLOAD_DIR;
});

describe("public upload route", () => {
  it("serves validated files from UPLOAD_DIR", async () => {
    const uploadRoot = await makeRoot();
    await writeFile(path.join(uploadRoot, STORAGE_KEY), new Uint8Array([1, 2, 3]));

    const response = await GET(new Request("http://localhost/uploads/test.webp"), paramsFor(STORAGE_KEY));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("supports HEAD without reading a response body", async () => {
    const uploadRoot = await makeRoot();
    await writeFile(path.join(uploadRoot, STORAGE_KEY), new Uint8Array([1, 2, 3]));

    const response = await HEAD(new Request("http://localhost/uploads/test.webp"), paramsFor(STORAGE_KEY));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBe("3");
    expect(await response.text()).toBe("");
  });

  it("returns 404 for missing or invalid storage keys", async () => {
    await makeRoot();

    await expect(GET(
      new Request("http://localhost/uploads/missing.webp"),
      paramsFor(STORAGE_KEY),
    )).resolves.toMatchObject({status: 404});
    await expect(GET(
      new Request("http://localhost/uploads/escape.webp"),
      paramsFor("2026/08/../secret.webp"),
    )).resolves.toMatchObject({status: 404});
    await expect(GET(
      new Request("http://localhost/uploads/private.enc"),
      paramsFor(`2026/08/${"b".repeat(64)}.enc`),
    )).resolves.toMatchObject({status: 404});
  });
});

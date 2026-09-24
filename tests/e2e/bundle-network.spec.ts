import { expect, test } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

async function identifyHeavyChunks() {
  const directory = "out/_next/static/chunks";
  const chunks = await Promise.all(
    (await readdir(directory))
      .filter((name) => name.endsWith(".js"))
      .map(async (name) => ({
        path: `/_next/static/chunks/${name}`,
        source: await readFile(join(directory, name), "utf8"),
      })),
  );
  const signatures = {
    renderer: "THREE.WebGLRenderer",
    masseria: "masseria-roof-simple",
    rover: "camera-eye-",
    creature: "eye-white-",
  };
  return Object.fromEntries(
    Object.entries(signatures).map(([feature, signature]) => {
      const paths = chunks
        .filter((chunk) => chunk.source.includes(signature))
        .map((chunk) => chunk.path);
      expect(
        paths.length,
        `The production output must contain the known ${feature} signature so the deferred-loading check cannot pass vacuously`,
      ).toBeGreaterThan(0);
      return [feature, paths];
    }),
  );
}

test("FE-020 / FE-022: ordinary routes do not request the renderer or full scenes", async ({
  page,
}) => {
  const chunks = await identifyHeavyChunks();
  const requested = new Set<string>();
  page.on("request", (request) => requested.add(new URL(request.url()).pathname));
  for (const route of [
    "/",
    "/new/",
    "/community/",
    "/marketplace/",
    "/plans/",
    "/design-system/",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("main")).toBeVisible();
    // A finite static-output network measurement, including idle route prefetches.
    await page.waitForLoadState("networkidle");
  }
  for (const [feature, paths] of Object.entries(chunks)) {
    expect(
      paths.filter((path) => requested.has(path)),
      `${feature} must remain deferred on ordinary routes`,
    ).toEqual([]);
  }
  await test.info().attach("ordinary-route-requests.json", {
    body: JSON.stringify([...requested], null, 2),
    contentType: "application/json",
  });
});

test("FE-004 / FE-020: active 3D requests only its selected scene and same-origin assets", async ({
  page,
  baseURL,
  browser,
}) => {
  const chunks = await identifyHeavyChunks();
  const requested = new Set<string>();
  const forbidden: string[] = [];
  const methods = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    requested.add(url.pathname);
    methods.add(`${request.method()} ${url.pathname}`);
    if (
      !["blob:", "data:"].includes(url.protocol) &&
      (url.origin !== new URL(baseURL!).origin || !["GET", "HEAD"].includes(request.method()))
    )
      forbidden.push(`${request.method()} ${url.href}`);
  });
  await page.goto("/editor/?project=masseria");
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible({
    timeout: 20000,
  });
  await page.waitForLoadState("networkidle");
  expect(chunks.renderer.some((path) => requested.has(path))).toBe(true);
  expect(chunks.masseria.some((path) => requested.has(path))).toBe(true);
  expect([...chunks.rover, ...chunks.creature].filter((path) => requested.has(path))).toEqual([]);
  expect(forbidden).toEqual([]);
  await test.info().attach("active-3d-requests.json", {
    body: JSON.stringify(
      {
        browser: browser.version(),
        os: process.platform,
        requests: [...requested],
        methods: [...methods],
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
});

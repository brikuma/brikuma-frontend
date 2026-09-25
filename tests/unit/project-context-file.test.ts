import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  decodeProjectContext,
  emptyProjectContext,
  encodeProjectContext,
  snapshotProjectContext,
  type ProjectContextState,
} from "../../src/adapters/project-context-file";

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
const close = vi.fn();
const decodeImage = vi.fn();

beforeEach(() => {
  close.mockReset();
  decodeImage.mockReset().mockResolvedValue({ width: 200, height: 100, close });
  vi.stubGlobal("createImageBitmap", decodeImage);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function context(): ProjectContextState {
  return {
    ...emptyProjectContext(),
    brief: { ...emptyProjectContext().brief, subject: "Build a small rover", maxPieces: "" },
    references: [
      {
        id: 3,
        filename: "profile.png",
        type: "image/png",
        size: png.length,
        blob: new Blob([png], { type: "image/png" }),
        url: "blob:previous-browser-session",
        width: 200,
        height: 100,
        validated: true,
      },
      { id: 7, filename: "notes.pdf", type: "application/pdf", size: 123 },
    ],
    calibrations: {
      3: { first: { x: 0, y: 20 }, second: { x: 100, y: 20 }, length: 8, plane: "XY" },
    },
  };
}

describe("Portable project brief and references", () => {
  it("retains Blob bytes in browser snapshots and encodes a JSON backup without temporary URLs", async () => {
    const source = context();
    const stored = snapshotProjectContext(source);
    expect(stored.references[0].blob).toBe(source.references[0].blob);
    expect(stored.references[0]).not.toHaveProperty("url");
    expect(stored.references[0]).not.toHaveProperty("validated");
    expect(stored.references[1]).not.toHaveProperty("blob");
    const encoded = await encodeProjectContext(source);
    const json = JSON.stringify(encoded);
    expect(json).not.toContain("blob:");
    expect(json).not.toContain('"blob"');
    expect(json).not.toContain('"validated"');
    expect(encoded.references[0].imageData).toBe(btoa(String.fromCharCode(...png)));
    expect(encoded.references[1]).toEqual(stored.references[1]);
    for (const input of [stored, JSON.parse(json)]) {
      const restored = await decodeProjectContext(input);
      if (!restored.ok) throw new Error(restored.error);
      expect(restored.value.brief).toEqual(source.brief);
      expect(restored.value.calibrations).toEqual(source.calibrations);
      expect(restored.value.references[0]).not.toHaveProperty("url");
      expect(new Uint8Array(await restored.value.references[0].blob!.arrayBuffer())).toEqual(png);
      expect(restored.value.references[1]).toEqual(source.references[1]);
    }
    expect(close).toHaveBeenCalledTimes(3);
    expect(source.references[0].url).toBe("blob:previous-browser-session");
    stored.brief.subject = "Snapshot changed independently";
    expect(source.brief.subject).toBe("Build a small rover");
  });

  it("restores dimensions by decoding an image whose metadata was not measured before the backup", async () => {
    const source = snapshotProjectContext(context());
    delete source.references[0].width;
    delete source.references[0].height;
    const restored = await decodeProjectContext(source);
    expect(restored).toMatchObject({
      ok: true,
      value: { references: [{ width: 200, height: 100 }, { type: "application/pdf" }] },
    });
  });

  it("rejects imported URLs without decoding or fetching them", async () => {
    const source = snapshotProjectContext(context());
    const result = await decodeProjectContext({
      ...source,
      references: [{ ...source.references[0], url: "https://example.invalid/private.png" }],
    });
    expect(result.ok).toBe(false);
    expect(decodeImage).not.toHaveBeenCalled();
  });

  it("rejects malformed reference identities, metadata and encoded content", async () => {
    const encoded = await encodeProjectContext(context());
    const image = encoded.references[0];
    const invalidImages = [
      { ...image, id: -1 },
      { ...image, id: 1.5 },
      { ...image, id: Number.MAX_SAFE_INTEGER },
      { ...image, type: "image/svg+xml" },
      { ...image, validated: true },
      { ...image, filename: "" },
      { ...image, size: 0 },
      { ...image, size: 10 * 1024 * 1024 + 1 },
      { ...image, size: image.size + 1 },
      { ...image, imageData: "data:image/png;base64,AAAA" },
      { ...image, imageData: btoa("<svg>not a PNG</svg>") },
      { ...image, blob: new Blob([png], { type: "image/png" }) },
      { ...image, width: 201 },
      { ...image, height: "100" },
    ];
    for (const reference of invalidImages) {
      expect(
        (await decodeProjectContext({ ...encoded, references: [reference], calibrations: {} })).ok,
      ).toBe(false);
    }
    expect(
      (await decodeProjectContext({ ...encoded, references: [image, image], calibrations: {} })).ok,
    ).toBe(false);
    expect(
      (
        await decodeProjectContext({
          ...encoded,
          references: Array.from({ length: 7 }, (_, id) => ({ ...image, id })),
        })
      ).ok,
    ).toBe(false);
  });

  it("rejects malformed briefs and keeps PDF references strictly metadata-only", async () => {
    const source = snapshotProjectContext(context());
    const invalid = [
      { ...source, brief: { ...source.brief, subject: "a".repeat(10_001) } },
      { ...source, brief: { ...source.brief, maxPieces: 500 } },
      { ...source, brief: { ...source.brief, subject: "A\u0000B" } },
      { ...source, brief: { ...source.brief, unrecognized: "field" } },
      { ...source, references: [{ ...source.references[1], size: -1 }] },
      { ...source, references: [{ ...source.references[1], imageData: "AAAA" }] },
      { ...source, references: [{ ...source.references[1], width: 200 }] },
    ];
    for (const candidate of invalid) expect((await decodeProjectContext(candidate)).ok).toBe(false);
  });

  it("rejects invalid or excessive image decoding and releases each decoded bitmap", async () => {
    const source = snapshotProjectContext(context());
    decodeImage.mockRejectedValueOnce(new Error("Undecodable image"));
    expect((await decodeProjectContext(source)).ok).toBe(false);
    decodeImage.mockResolvedValueOnce({ width: 10_000, height: 10_000, close });
    expect((await decodeProjectContext(source)).ok).toBe(false);
    decodeImage.mockResolvedValueOnce({ width: 0, height: 100, close });
    expect((await decodeProjectContext(source)).ok).toBe(false);
    expect(close).toHaveBeenCalledTimes(2);
  });

  it("rejects orphaned, outside-image, coincident or unsupported calibrations", async () => {
    const source = snapshotProjectContext(context());
    const original = source.calibrations[3];
    const invalid = [
      { 99: original },
      { 7: original },
      { 3: { ...original, first: { x: -1, y: 0 } } },
      { 3: { ...original, second: { x: 201, y: 0 } } },
      { 3: { ...original, second: original.first } },
      { 3: { ...original, length: Infinity } },
      { 3: { ...original, plane: "unsafe" } },
    ];
    for (const calibrations of invalid)
      expect((await decodeProjectContext({ ...source, calibrations })).ok).toBe(false);
  });

  it("refuses to save malformed outgoing metadata or export undecodable image bytes", async () => {
    const oversized = context();
    oversized.brief.subject = "a".repeat(10_001);
    expect(() => snapshotProjectContext(oversized)).toThrow("bounded text");
    await expect(encodeProjectContext(oversized)).rejects.toThrow("bounded text");
    const invalidImage = context();
    invalidImage.references[0].blob = new Blob([new Uint8Array(png.length)], { type: "image/png" });
    await expect(encodeProjectContext(invalidImage)).rejects.toThrow("declared image type");
  });

  it("ends a stalled decoder after ten seconds and releases a bitmap that arrives too late", async () => {
    vi.useFakeTimers();
    let complete!: (value: { width: number; height: number; close: () => void }) => void;
    decodeImage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const result = decodeProjectContext(snapshotProjectContext(context()));
    await vi.advanceTimersByTimeAsync(10_001);
    expect((await result).ok).toBe(false);
    complete({ width: 200, height: 100, close });
    await Promise.resolve();
    expect(close).toHaveBeenCalledOnce();
  });
});

// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ReferencePicker,
  validateReference,
} from "../../src/features/project-brief/reference-picker";

import { ProjectContextProvider } from "../../src/features/project-brief/project-context";

const createObjectURL = vi.fn(() => "blob:local-reference");
const revokeObjectURL = vi.fn();
const OriginalURL = URL;
const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1]);
const webpBytes = new Uint8Array([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80, 1]);
const decodeImage = vi.fn();
beforeEach(() => {
  decodeImage.mockReset().mockResolvedValue({ width: 200, height: 100, close: vi.fn() });
  vi.stubGlobal("createImageBitmap", decodeImage);
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  vi.stubGlobal(
    "URL",
    class extends OriginalURL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("FE-003: browser-session reference selection", () => {
  it("rejects unsupported, empty, oversized and seventh files", () => {
    expect(validateReference({ type: "image/svg+xml", size: 300 }, 0)).toContain(
      "Other file types",
    );
    expect(validateReference({ type: "image/png", size: 0 }, 0)).toContain("Empty");
    expect(validateReference({ type: "image/png", size: 10 * 1024 * 1024 + 1 }, 0)).toContain(
      "10 MB",
    );
    expect(validateReference({ type: "application/pdf", size: 300 }, 6)).toContain("six");
    expect(validateReference({ type: "image/webp", size: 10 * 1024 * 1024 }, 5)).toBeNull();
  });

  it("previews a local image and revokes its URL on removal", async () => {
    const user = userEvent.setup();
    render(<ReferencePicker />, { wrapper: ProjectContextProvider });
    await user.upload(
      screen.getByLabelText("Choose reference files"),
      new File([pngBytes], "courtyard.png", { type: "image/png" }),
    );
    expect(screen.getByRole("img", { name: "courtyard.png" })).toBeVisible();
    expect(createObjectURL).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Remove courtyard.png" }));
    expect(screen.queryByText("courtyard.png")).not.toBeInTheDocument();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:local-reference");
  });

  it("shows PDF filename metadata without creating a preview or parsing it", async () => {
    const user = userEvent.setup();
    render(<ReferencePicker />, { wrapper: ProjectContextProvider });
    await user.upload(
      screen.getByLabelText("Choose reference files"),
      new File(["example"], "reference.pdf", { type: "application/pdf" }),
    );
    expect(screen.getByText("reference.pdf")).toBeVisible();
    expect(screen.getByText("PDF · filename only, not parsed")).toBeVisible();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("shows a useful error for unsupported input while retaining valid references", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<ReferencePicker />, { wrapper: ProjectContextProvider });
    const fileInput = screen.getByLabelText("Choose reference files");
    await user.upload(fileInput, new File(["document"], "brief.pdf", { type: "application/pdf" }));
    await user.upload(fileInput, new File(["<svg/>"], "unsafe.svg", { type: "image/svg+xml" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Other file types are not supported");
    expect(screen.getByText("brief.pdf")).toBeVisible();
    expect(screen.queryByText("unsafe.svg")).not.toBeInTheDocument();
  });

  it("removes undecodable images and releases their object URL", async () => {
    const user = userEvent.setup();
    decodeImage.mockRejectedValueOnce(new Error("Undecodable image"));
    render(<ReferencePicker />, { wrapper: ProjectContextProvider });
    await user.upload(
      screen.getByLabelText("Choose reference files"),
      new File([pngBytes], "broken.png", { type: "image/png" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be read or decoded");
    expect(screen.queryByRole("img", { name: "broken.png" })).not.toBeInTheDocument();
    expect(revokeObjectURL).toHaveBeenCalledOnce();
  });

  it("rejects decoded images above the shared 40-million-pixel limit", async () => {
    const user = userEvent.setup();
    render(<ReferencePicker />, { wrapper: ProjectContextProvider });
    await user.upload(
      screen.getByLabelText("Choose reference files"),
      new File([pngBytes], "large.png", { type: "image/png" }),
    );
    const image = screen.getByRole("img", { name: "large.png" }).querySelector("img")!;
    Object.defineProperties(image, {
      naturalWidth: { value: 8000 },
      naturalHeight: { value: 6000 },
    });
    fireEvent.load(image);
    expect(screen.getByRole("alert")).toHaveTextContent("no more than 40 million pixels");
    expect(screen.queryByRole("img", { name: "large.png" })).not.toBeInTheDocument();
    expect(revokeObjectURL).toHaveBeenCalledOnce();
  });

  it("releases live image URLs on unmount", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ReferencePicker />, { wrapper: ProjectContextProvider });
    await user.upload(
      screen.getByLabelText("Choose reference files"),
      new File([webpBytes], "local.webp", { type: "image/webp" }),
    );
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:local-reference");
  });
});

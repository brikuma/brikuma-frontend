import { describe, expect, it } from "vitest";
import {
  centimetersToStuds,
  formatCentimeters,
  isValidTransform,
  studsToCentimeters,
} from "../../src/core/model/public";

describe("Nominal centimeter presentation", () => {
  it("uses 8 mm pitch, 9.6 mm brick height and 3.2 mm plate height", () => {
    expect(studsToCentimeters(1)).toBe(0.8);
    expect(studsToCentimeters(1.2)).toBe(0.96);
    expect(studsToCentimeters(0.4)).toBe(0.32);
    expect(formatCentimeters(0.24)).toBe("0.192");
    expect(formatCentimeters(24)).toBe("19.2");
  });
  it.each([-40, -2.1, 0, 0.05, 0.1, 0.6, 1.45, 40])(
    "round-trips a canonical distance of %s without changing it",
    (distance) => {
      expect(centimetersToStuds(studsToCentimeters(distance))).toBe(distance);
    },
  );
  it("preserves grid validation instead of rounding an arbitrary metric input onto it", () => {
    expect(
      isValidTransform(
        { x: centimetersToStuds(0.08), y: centimetersToStuds(0.04), z: 0, rotation: 0 },
        40,
      ),
    ).toBe(true);
    expect(isValidTransform({ x: centimetersToStuds(0.1), y: 0, z: 0, rotation: 0 }, 40)).toBe(
      false,
    );
  });
});

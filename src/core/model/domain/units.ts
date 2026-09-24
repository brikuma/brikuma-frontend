/** Nominal metric pitch: 20 LDU × 0.4 mm/LDU, not measured manufacturing dimensions. */
export const STUD_PITCH_CM = 0.8;

export function studsToCentimeters(studs: number): number {
  return Number((studs * STUD_PITCH_CM).toFixed(10));
}

export function centimetersToStuds(centimeters: number): number {
  return Number((centimeters / STUD_PITCH_CM).toFixed(10));
}

/** Formats a canonical model distance as a metric value; consumers supply the cm label. */
export function formatCentimeters(studs: number): string {
  return String(Number(studsToCentimeters(studs).toFixed(3)));
}

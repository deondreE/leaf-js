import { Vec4 } from "./types/scene.types";

/**
 * Normalizes a color so all channels are in 0–1.
 * Accepts either 0–1 or 0–255 user ranges safely.
 */
export function normalizeColor(c: Vec4): [number, number, number, number] {
  // If all channels > 1, assume 0–255 scale
  const maxChannel = Math.max(c.r, c.g, c.b, c.a ?? 1);
  const needsScaling = maxChannel > 1.0;
  const scale = needsScaling ? 1 / 255 : 1;
  return [
    Math.min(1, Math.max(0, c.r * scale)),
    Math.min(1, Math.max(0, c.g * scale)),
    Math.min(1, Math.max(0, c.b * scale)),
    Math.min(1, Math.max(0, c.a * scale)),
  ];
}

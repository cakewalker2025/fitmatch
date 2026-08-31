import { hexToHsl } from "./harmony";

/**
 * Returns the relative value/lightness contrast between two hex colors
 * as a 0-1 scale, where 0 is identical lightness and 1 is the maximum
 * possible spread (pure black vs. pure white).
 */
export function getValueContrast(hexA: string, hexB: string): number {
  return Math.abs(hexToHsl(hexA).l - hexToHsl(hexB).l);
}

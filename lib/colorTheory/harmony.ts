export interface HSL {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): HSL {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.substring(0, 2), 16) / 255;
  const g = parseInt(normalized.substring(2, 4), 16) / 255;
  const b = parseInt(normalized.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const delta = max - min;
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / delta) % 6;
      break;
    case g:
      h = (b - r) / delta + 2;
      break;
    default:
      h = (r - g) / delta + 4;
      break;
  }
  h *= 60;
  if (h < 0) h += 360;

  return { h, s, l };
}

function hslToHex({ h, s, l }: HSL): string {
  const hueNormalized = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hueNormalized / 60) % 2) - 1));
  const m = l - c / 2;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (hueNormalized < 60) {
    rp = c;
    gp = x;
  } else if (hueNormalized < 120) {
    rp = x;
    gp = c;
  } else if (hueNormalized < 180) {
    gp = c;
    bp = x;
  } else if (hueNormalized < 240) {
    gp = x;
    bp = c;
  } else if (hueNormalized < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }

  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(rp)}${toHex(gp)}${toHex(bp)}`;
}

function rotateHue(hex: string, degrees: number): string {
  const hsl = hexToHsl(hex);
  return hslToHex({ ...hsl, h: hsl.h + degrees });
}

export function getComplementary(hex: string): string {
  return rotateHue(hex, 180);
}

export function getAnalogous(hex: string): [string, string] {
  return [rotateHue(hex, -30), rotateHue(hex, 30)];
}

export function getTriadic(hex: string): [string, string] {
  return [rotateHue(hex, 120), rotateHue(hex, 240)];
}

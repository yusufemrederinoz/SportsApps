export const CREST_PATTERNS = ['plain', 'halves', 'diagonal', 'stripes', 'hoops', 'sash', 'band', 'pale'] as const;

export type CrestPattern = (typeof CREST_PATTERNS)[number];

export interface ClubCrest {
  code: string;
  pattern: CrestPattern;
  colors: readonly [string, string];
  trim?: string;
}

export const CREST_WIDTH = 100;
export const CREST_HEIGHT = 112;
export const RIBBON_TOP = 38;
export const RIBBON_HEIGHT = 24;

const SHIELD = 'M8 6 H92 V58 C92 86 72 100 50 108 C28 100 8 86 8 58 Z';
const OUTLINE_WIDTH = 5;
const DARK_LUMINANCE = 0.05;
const LIGHT_OUTLINE = '#C9CED6';
const RIBBON_COLOR = '#FFFFFF';
const RIBBON_EDGE = '#05070A';
const STRIPE_LEFT = 8;
const STRIPE_WIDTH = 16.8;
const HOOP_TOPS = [23, 57, 91];
const HOOP_HEIGHT = 17;

function rectangle(x: number, y: number, width: number, height: number, fill: string): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`;
}

const SHAPES: Record<CrestPattern, (fill: string) => string> = {
  plain: () => '',
  halves: (fill) => rectangle(CREST_WIDTH / 2, 0, CREST_WIDTH / 2, CREST_HEIGHT, fill),
  diagonal: (fill) => `<polygon points="${CREST_WIDTH},0 ${CREST_WIDTH},${CREST_HEIGHT} 0,${CREST_HEIGHT}" fill="${fill}"/>`,
  stripes: (fill) => [1, 3].map((index) => rectangle(STRIPE_LEFT + index * STRIPE_WIDTH, 0, STRIPE_WIDTH, CREST_HEIGHT, fill)).join(''),
  hoops: (fill) => HOOP_TOPS.map((top) => rectangle(0, top, CREST_WIDTH, HOOP_HEIGHT, fill)).join(''),
  sash: (fill) => `<polygon points="8,6 34,6 92,82 92,108 66,108 8,32" fill="${fill}"/>`,
  band: (fill) => rectangle(0, 68, CREST_WIDTH, 18, fill),
  pale: (fill) => rectangle(38, 0, 24, CREST_HEIGHT, fill),
};

export function luminance(color: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16) / 255);
  const [red = 0, green = 0, blue = 0] = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function outlineOf(crest: ClubCrest): string {
  const wanted = crest.trim ?? crest.colors[1];
  return luminance(wanted) < DARK_LUMINANCE ? LIGHT_OUTLINE : wanted;
}

export function crestSvg(crest: ClubCrest): string {
  const [first, second] = crest.colors;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CREST_WIDTH} ${CREST_HEIGHT}">`,
    `<defs><clipPath id="shield"><path d="${SHIELD}"/></clipPath></defs>`,
    '<g clip-path="url(#shield)">',
    rectangle(0, 0, CREST_WIDTH, CREST_HEIGHT, first),
    SHAPES[crest.pattern](second),
    '</g>',
    `<path d="${SHIELD}" fill="none" stroke="${outlineOf(crest)}" stroke-width="${OUTLINE_WIDTH}" stroke-linejoin="round"/>`,
    `<rect x="2" y="${RIBBON_TOP}" width="${CREST_WIDTH - 4}" height="${RIBBON_HEIGHT}" rx="5" fill="${RIBBON_COLOR}" stroke="${RIBBON_EDGE}" stroke-opacity="0.35" stroke-width="1.5"/>`,
    '</svg>',
  ].join('');
}

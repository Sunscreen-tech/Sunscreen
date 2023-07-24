import {isBrowser} from '@probe.gl/env';

export enum COLOR {
  BLACK = 30,
  RED = 31,
  GREEN = 32,
  YELLOW = 33,
  BLUE = 34,
  MAGENTA = 35,
  CYAN = 36,
  WHITE = 37,

  BRIGHT_BLACK = 90,
  BRIGHT_RED = 91,
  BRIGHT_GREEN = 92,
  BRIGHT_YELLOW = 93,
  BRIGHT_BLUE = 94,
  BRIGHT_MAGENTA = 95,
  BRIGHT_CYAN = 96,
  BRIGHT_WHITE = 97
}

const BACKGROUND_INCREMENT = 10;

function getColor(color: string | COLOR): number {
  if (typeof color !== 'string') {
    return color;
  }
  color = color.toUpperCase();
  return COLOR[color] || COLOR.WHITE;
}

export function addColor(
  string: string,
  color: string | COLOR,
  background?: string | COLOR
): string {
  if (!isBrowser && typeof string === 'string') {
    if (color) {
      const colorCode = getColor(color);
      string = `\u001b[${colorCode}m${string}\u001b[39m`;
    }
    if (background) {
      // background colors values are +10
      const colorCode = getColor(background);
      string = `\u001b[${colorCode + BACKGROUND_INCREMENT}m${string}\u001b[49m`;
    }
  }
  return string;
}

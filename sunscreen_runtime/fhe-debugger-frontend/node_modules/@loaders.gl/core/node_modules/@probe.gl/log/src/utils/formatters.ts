// probe.gl, MIT license

export type FormatValueOptions = {
  isInteger?: boolean;
  maxElts?: number;
  size?: number;
};

/**
 * Format time
 */
export function formatTime(ms: number): string {
  let formatted;
  if (ms < 10) {
    formatted = `${ms.toFixed(2)}ms`;
  } else if (ms < 100) {
    formatted = `${ms.toFixed(1)}ms`;
  } else if (ms < 1000) {
    formatted = `${ms.toFixed(0)}ms`;
  } else {
    formatted = `${(ms / 1000).toFixed(2)}s`;
  }
  return formatted;
}

export function leftPad(string: string, length: number = 8): string {
  const padLength = Math.max(length - string.length, 0);
  return `${' '.repeat(padLength)}${string}`;
}

export function rightPad(string: string, length: number = 8): string {
  const padLength = Math.max(length - string.length, 0);
  return `${string}${' '.repeat(padLength)}`;
}

export function formatValue(v: unknown, options: FormatValueOptions = {}): string {
  const EPSILON = 1e-16;
  const {isInteger = false} = options;
  if (Array.isArray(v) || ArrayBuffer.isView(v)) {
    return formatArrayValue(v, options);
  }
  if (!Number.isFinite(v)) {
    return String(v);
  }
  // @ts-expect-error
  if (Math.abs(v) < EPSILON) {
    return isInteger ? '0' : '0.';
  }
  if (isInteger) {
    // @ts-expect-error
    return v.toFixed(0);
  }
  // @ts-expect-error
  if (Math.abs(v) > 100 && Math.abs(v) < 10000) {
    // @ts-expect-error
    return v.toFixed(0);
  }
  // @ts-expect-error
  const string = v.toPrecision(2);
  const decimal = string.indexOf('.0');
  return decimal === string.length - 2 ? string.slice(0, -1) : string;
}

/** Helper to formatValue */
function formatArrayValue(v: any, options: FormatValueOptions) {
  const {maxElts = 16, size = 1} = options;
  let string = '[';
  for (let i = 0; i < v.length && i < maxElts; ++i) {
    if (i > 0) {
      string += `,${i % size === 0 ? ' ' : ''}`;
    }
    string += formatValue(v[i], options);
  }
  const terminator = v.length > maxElts ? '...' : ']';
  return `${string}${terminator}`;
}

/**
 * Log an image to the console (uses browser specific console formatting styles)
 * Inspired by https://github.com/hughsk/console-image (MIT license)
 */
export function formatImage(image: any, message: string, scale: number, maxWidth: number = 600) {
  const imageUrl = image.src.replace(/\(/g, '%28').replace(/\)/g, '%29');

  if (image.width > maxWidth) {
    scale = Math.min(scale, maxWidth / image.width);
  }

  const width = image.width * scale;
  const height = image.height * scale;

  const style = [
    'font-size:1px;',
    `padding:${Math.floor(height / 2)}px ${Math.floor(width / 2)}px;`,
    `line-height:${height}px;`,
    `background:url(${imageUrl});`,
    `background-size:${width}px ${height}px;`,
    'color:transparent;'
  ].join('');

  return [`${message} %c+`, style];
}

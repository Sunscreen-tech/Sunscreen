import stream from 'stream';
export let Transform;
export const isSupported = Boolean(stream);
try {
  Transform = stream.Transform;
} catch {}
//# sourceMappingURL=stream.js.map
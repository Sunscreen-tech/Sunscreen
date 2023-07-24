/**
 * Intercepts the Response stream and creates a new Response
 */
export default function fetchProgress(response: Response | Promise<Response>, onProgress: any, // TODO better callback types
onDone?: () => void, onError?: () => void): Promise<Response>;
//# sourceMappingURL=fetch-progress.d.ts.map
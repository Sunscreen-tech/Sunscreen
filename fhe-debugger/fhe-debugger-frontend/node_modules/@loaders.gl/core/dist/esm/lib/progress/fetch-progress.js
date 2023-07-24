export default async function fetchProgress(response, onProgress) {
  let onDone = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : () => {};
  let onError = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : () => {};
  response = await response;
  if (!response.ok) {
    return response;
  }
  const body = response.body;
  if (!body) {
    return response;
  }
  const contentLength = response.headers.get('content-length') || 0;
  const totalBytes = contentLength ? parseInt(contentLength) : 0;
  if (!(totalBytes > 0)) {
    return response;
  }
  if (typeof ReadableStream === 'undefined' || !body.getReader) {
    return response;
  }
  const progressStream = new ReadableStream({
    async start(controller) {
      const reader = body.getReader();
      await read(controller, reader, 0, totalBytes, onProgress, onDone, onError);
    }
  });
  return new Response(progressStream);
}
async function read(controller, reader, loadedBytes, totalBytes, onProgress, onDone, onError) {
  try {
    const {
      done,
      value
    } = await reader.read();
    if (done) {
      onDone();
      controller.close();
      return;
    }
    loadedBytes += value.byteLength;
    const percent = Math.round(loadedBytes / totalBytes * 100);
    onProgress(percent, {
      loadedBytes,
      totalBytes
    });
    controller.enqueue(value);
    await read(controller, reader, loadedBytes, totalBytes, onProgress, onDone, onError);
  } catch (error) {
    controller.error(error);
    onError(error);
  }
}
//# sourceMappingURL=fetch-progress.js.map
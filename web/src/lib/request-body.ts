export class RequestBodyTooLarge extends Error {
  constructor() {
    super("The request body exceeds the allowed size.");
  }
}

// Content-Length is optional and cannot be trusted for streamed uploads. Stop
// reading at the limit instead of buffering the entire body before checking it.
export async function readRequestBody(
  request: Request,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const declaredSize = Number(request.headers.get("content-length"));
  if (declaredSize > limit) {
    await request.body?.cancel().catch(() => {});
    throw new RequestBodyTooLarge();
  }
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new RequestBodyTooLarge();
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

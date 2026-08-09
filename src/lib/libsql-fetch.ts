type LibsqlRequestLike = {
  arrayBuffer?: () => Promise<ArrayBuffer>;
  headers?: HeadersInit;
  method?: string;
  signal?: AbortSignal | null;
  url: string;
};

/**
 * Sends libSQL's request-like values through the Worker-native fetch instead
 * of the Node-compatible fetch shim bundled by Vinext.
 */
export async function cloudflareLibsqlFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (typeof input === "string" || input instanceof URL || input instanceof Request) {
    return globalThis.fetch(input, init);
  }

  const request = input as unknown as LibsqlRequestLike;
  const method = init?.method ?? request.method ?? "GET";
  const body = init?.body ?? (
    method === "GET" || method === "HEAD" || !request.arrayBuffer
      ? undefined
      : await request.arrayBuffer()
  );

  return globalThis.fetch(request.url, {
    body,
    headers: init?.headers ?? copyHeaders(request.headers),
    method,
    signal: init?.signal ?? request.signal ?? undefined,
  });
}

function copyHeaders(headers: HeadersInit | undefined): HeadersInit | undefined {
  if (!headers || typeof (headers as Headers).forEach !== "function") {
    return headers;
  }

  const copiedHeaders = new Headers();
  (headers as Headers).forEach((value, name) => copiedHeaders.append(name, value));
  return copiedHeaders;
}

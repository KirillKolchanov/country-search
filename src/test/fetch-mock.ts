export interface PendingRequest {
  url: string;
  signal: AbortSignal | undefined;
  respond: (response: Response) => void;
  fail: (error: unknown) => void;
}

/**
 * `fetch` replacement that behaves like the real one with respect to `signal`:
 * an aborted signal rejects the pending promise with `signal.reason`
 * (`AbortError` / `TimeoutError` DOMException). Tests settle requests manually,
 * so they control the order in which responses arrive.
 */
export function createFetchMock(): {
  fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  requests: PendingRequest[];
} {
  const requests: PendingRequest[] = [];

  const fetchMock = vi.fn<typeof fetch>(
    (input, init) =>
      new Promise<Response>((resolve, reject) => {
        const signal = init?.signal ?? undefined;
        const url = input instanceof Request ? input.url : input.toString();

        if (signal?.aborted) {
          reject(signal.reason as Error);
          return;
        }
        signal?.addEventListener(
          'abort',
          () => {
            reject(signal.reason as Error);
          },
          { once: true },
        );

        requests.push({ url, signal, respond: resolve, fail: reject });
      }),
  );

  return { fetchMock, requests };
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function textResponse(text: string, status: number): Response {
  return new Response(text, { status, headers: { 'Content-Type': 'text/plain' } });
}

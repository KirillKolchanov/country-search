import type { Country } from '../domain/country.js';
import { HttpError } from './http-error.js';
import { mapCountryResponse } from './map-country-response.js';
import type { RawCountry } from './types.js';

export const API_BASE_URL = 'https://countries.dev';

/** How long to wait for a response before failing with `TimeoutError`. */
export const SEARCH_TIMEOUT_MS = 8000;

export interface SearchOptions {
  timeoutMs?: number;
}

/** countries.dev answers 404 when nothing matches the query. */
const NO_MATCHES_STATUS = 404;

function buildSearchUrl(query: string): string {
  return `${API_BASE_URL}/name/${encodeURIComponent(query.trim())}`;
}

/**
 * Same contract as `AbortSignal.timeout(ms)` (aborts with a `TimeoutError` DOMException),
 * but the controller is held by the timer, so the signal cannot be garbage-collected
 * before it fires, and the timer can be cleared as soon as the request is settled.
 */
function createTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timerId = setTimeout(() => {
    controller.abort(new DOMException(`Request timed out after ${String(ms)} ms`, 'TimeoutError'));
  }, ms);

  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timerId);
    },
  };
}

/**
 * Searches countries by name.
 * Resolves with `[]` when the API reports no matches (404),
 * rejects with `HttpError` for other unsuccessful statuses.
 * Network errors are passed through unchanged; cancellation through `signal`
 * rejects with `AbortError`, a slow server with `TimeoutError`.
 */
export async function searchCountries(
  query: string,
  signal: AbortSignal,
  { timeoutMs = SEARCH_TIMEOUT_MS }: SearchOptions = {},
): Promise<Country[]> {
  // One signal for fetch, two reasons to abort: our cancellation or the timeout.
  // Each keeps its own `reason`, so AbortError and TimeoutError stay distinguishable.
  const timeout = createTimeout(timeoutMs);
  const requestSignal = AbortSignal.any([signal, timeout.signal]);

  try {
    const response = await fetch(buildSearchUrl(query), { signal: requestSignal });

    if (response.status === NO_MATCHES_STATUS) return [];
    // fetch does not reject on 4xx/5xx, so the status has to be checked by hand.
    if (!response.ok) throw new HttpError(response.status);

    const data = (await response.json()) as RawCountry[];
    return data.map(mapCountryResponse);
  } finally {
    timeout.clear();
  }
}

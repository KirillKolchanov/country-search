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
 * Searches countries by name.
 * Resolves with `[]` when the API reports no matches (404),
 * rejects with `HttpError` for other unsuccessful statuses.
 * Network errors and `AbortError` are passed through unchanged.
 */
export async function searchCountries(
  query: string,
  signal: AbortSignal,
  _options: SearchOptions = {},
): Promise<Country[]> {
  const response = await fetch(buildSearchUrl(query), { signal });

  if (response.status === NO_MATCHES_STATUS) return [];
  // fetch does not reject on 4xx/5xx, so the status has to be checked by hand.
  if (!response.ok) throw new HttpError(response.status);

  const data = (await response.json()) as RawCountry[];
  return data.map(mapCountryResponse);
}

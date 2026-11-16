import type { Country } from '../domain/country.js';

export const API_BASE_URL = 'https://countries.dev';

/**
 * Searches countries by name.
 * Resolves with `[]` when the API reports no matches (404),
 * rejects with `HttpError` for other unsuccessful statuses.
 */
export function searchCountries(_query: string, _signal: AbortSignal): Promise<Country[]> {
  return Promise.reject(new Error('Not implemented'));
}

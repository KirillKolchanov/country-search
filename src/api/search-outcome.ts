import type { Country } from '../domain/country.js';
import type { SearchOptions } from './search-countries.js';

/** Real failures that the user should see (with a retry button). */
export type SearchFailureReason = 'timeout' | 'http' | 'network' | 'unknown';

export type SearchOutcome =
  | { type: 'results'; countries: Country[] }
  /** No matches (API answered 404). Not an error. */
  | { type: 'empty' }
  /** The request was cancelled by us (new input / cleared field). Not an error. */
  | { type: 'cancelled' }
  | { type: 'error'; reason: SearchFailureReason; message: string; status?: number };

/** Maps anything thrown by `searchCountries` to an outcome the UI can render. */
export function classifySearchError(_error: unknown): SearchOutcome {
  throw new Error('Not implemented');
}

/** Runs a search and never rejects: every result or failure becomes a `SearchOutcome`. */
export function runSearch(
  _query: string,
  _signal: AbortSignal,
  _options: SearchOptions = {},
): Promise<SearchOutcome> {
  return Promise.reject(new Error('Not implemented'));
}

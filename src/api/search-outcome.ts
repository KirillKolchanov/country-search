import type { Country } from '../domain/country.js';
import { HttpError } from './http-error.js';
import { searchCountries } from './search-countries.js';
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

const NOT_FOUND_STATUS = 404;

const MESSAGES = {
  timeout: 'The server took too long to respond. Please try again.',
  network: 'Network error. Check your connection and try again.',
  unknown: 'Something went wrong. Please try again.',
  http: (status: number) =>
    `The server responded with an error (${String(status)}). Please try again.`,
} as const;

/** `DOMException` from `abort()` / `AbortSignal.timeout()` is identified by its `name`. */
function hasErrorName(error: unknown, name: string): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === name;
}

/** Maps anything thrown by `searchCountries` to an outcome the UI can render. */
export function classifySearchError(error: unknown): SearchOutcome {
  if (hasErrorName(error, 'AbortError')) return { type: 'cancelled' };
  if (hasErrorName(error, 'TimeoutError')) {
    return { type: 'error', reason: 'timeout', message: MESSAGES.timeout };
  }
  if (error instanceof HttpError) {
    if (error.status === NOT_FOUND_STATUS) return { type: 'empty' };
    return {
      type: 'error',
      reason: 'http',
      status: error.status,
      message: MESSAGES.http(error.status),
    };
  }
  // fetch rejects with TypeError when the network request itself fails.
  if (error instanceof TypeError) {
    return { type: 'error', reason: 'network', message: MESSAGES.network };
  }
  return { type: 'error', reason: 'unknown', message: MESSAGES.unknown };
}

/** Runs a search and never rejects: every result or failure becomes a `SearchOutcome`. */
export async function runSearch(
  query: string,
  signal: AbortSignal,
  options: SearchOptions = {},
): Promise<SearchOutcome> {
  try {
    const countries = await searchCountries(query, signal, options);
    return countries.length > 0 ? { type: 'results', countries } : { type: 'empty' };
  } catch (error) {
    return classifySearchError(error);
  }
}

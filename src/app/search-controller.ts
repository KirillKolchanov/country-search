import type { SearchFailureReason, SearchOutcome } from '../api/search-outcome.js';
import type { Country } from '../domain/country.js';

/** Delay between the last keystroke and the network request. */
export const SEARCH_DEBOUNCE_MS = 300;

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'results'; query: string; countries: Country[] }
  | { status: 'empty'; query: string }
  | { status: 'error'; query: string; reason: SearchFailureReason; message: string };

export type SearchFn = (query: string, signal: AbortSignal) => Promise<SearchOutcome>;

export interface SearchControllerOptions {
  onChange: (state: SearchState) => void;
  /** Defaults to `runSearch`. */
  search?: SearchFn;
  debounceMs?: number;
}

export interface SearchController {
  /** Call on every input change. */
  setQuery: (query: string) => void;
  /** Repeats the last entered query right away. */
  retry: () => void;
  getState: () => SearchState;
  /** Cancels everything in progress. */
  dispose: () => void;
}

/**
 * DOM-free search logic: debounces input, really cancels stale requests
 * with `AbortController` and turns search outcomes into screen state.
 */
export function createSearchController(_options: SearchControllerOptions): SearchController {
  throw new Error('Not implemented');
}

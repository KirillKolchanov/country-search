import { runSearch } from '../api/search-outcome.js';
import type { SearchFailureReason, SearchOutcome } from '../api/search-outcome.js';
import type { Country } from '../domain/country.js';
import { debounce } from '../utils/debounce.js';

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
export function createSearchController({
  onChange,
  search = runSearch,
  debounceMs = SEARCH_DEBOUNCE_MS,
}: SearchControllerOptions): SearchController {
  let state: SearchState = { status: 'idle' };
  /** Last value entered by the user (trimmed); `retry()` repeats exactly this. */
  let latestQuery = '';
  /** Controller of the request that is currently in flight, if any. */
  let activeRequest: AbortController | null = null;

  function setState(next: SearchState): void {
    state = next;
    onChange(next);
  }

  function abortActiveRequest(): void {
    activeRequest?.abort();
    activeRequest = null;
  }

  function applyOutcome(query: string, outcome: SearchOutcome): void {
    switch (outcome.type) {
      // Our own cancellation: a newer input already owns the screen.
      case 'cancelled':
        return;
      case 'results':
        setState({ status: 'results', query, countries: outcome.countries });
        return;
      case 'empty':
        setState({ status: 'empty', query });
        return;
      case 'error':
        setState({ status: 'error', query, reason: outcome.reason, message: outcome.message });
        return;
    }
  }

  async function execute(query: string): Promise<void> {
    abortActiveRequest();
    const request = new AbortController();
    activeRequest = request;

    const outcome = await search(query, request.signal);
    applyOutcome(query, outcome);
  }

  const debouncedExecute = debounce((query: string) => {
    void execute(query);
  }, debounceMs);

  function setQuery(rawQuery: string): void {
    const query = rawQuery.trim();
    latestQuery = query;
    // Cancel on every input change, not only when the debounced search fires:
    // otherwise a stale response could land while the new one is still waiting.
    abortActiveRequest();

    if (!query) {
      debouncedExecute.cancel();
      if (state.status !== 'idle') setState({ status: 'idle' });
      return;
    }

    setState({ status: 'loading', query });
    debouncedExecute(query);
  }

  function retry(): void {
    if (!latestQuery) return;
    debouncedExecute.cancel();
    setState({ status: 'loading', query: latestQuery });
    void execute(latestQuery);
  }

  function dispose(): void {
    debouncedExecute.cancel();
    abortActiveRequest();
  }

  return { setQuery, retry, getState: () => state, dispose };
}

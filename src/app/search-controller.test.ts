import spainResponse from '../test/fixtures/spain.json' with { type: 'json' };
import { mapCountryResponse } from '../api/map-country-response.js';
import type { SearchOutcome } from '../api/search-outcome.js';
import { createSearchController, SEARCH_DEBOUNCE_MS } from './search-controller.js';
import type { SearchController, SearchFn, SearchState } from './search-controller.js';

interface SearchCall {
  query: string;
  signal: AbortSignal;
  settle: (outcome: SearchOutcome) => void;
}

/**
 * Search stub with the same contract as `runSearch`: it never rejects and
 * resolves with `cancelled` as soon as its signal is aborted.
 */
function createSearchMock(): { search: ReturnType<typeof vi.fn<SearchFn>>; calls: SearchCall[] } {
  const calls: SearchCall[] = [];
  const search = vi.fn<SearchFn>(
    (query, signal) =>
      new Promise<SearchOutcome>((resolve) => {
        signal.addEventListener(
          'abort',
          () => {
            resolve({ type: 'cancelled' });
          },
          { once: true },
        );
        calls.push({ query, signal, settle: resolve });
      }),
  );
  return { search, calls };
}

const countries = spainResponse.map(mapCountryResponse);
const results: SearchOutcome = { type: 'results', countries };
const serverError: SearchOutcome = {
  type: 'error',
  reason: 'http',
  status: 500,
  message: 'Server error',
};

describe('createSearchController', () => {
  let search: ReturnType<typeof vi.fn<SearchFn>>;
  let calls: SearchCall[];
  let onChange: ReturnType<typeof vi.fn<(state: SearchState) => void>>;
  let controller: SearchController;

  beforeEach(() => {
    vi.useFakeTimers();
    ({ search, calls } = createSearchMock());
    onChange = vi.fn<(state: SearchState) => void>();
    controller = createSearchController({ onChange, search });
  });

  afterEach(() => {
    controller.dispose();
    vi.useRealTimers();
  });

  function call(index: number): SearchCall {
    const found = calls[index];
    if (!found) throw new Error(`search call #${String(index)} was not made`);
    return found;
  }

  /** Types `query` and lets the debounce timer fire. */
  async function typeAndWait(query: string): Promise<void> {
    controller.setQuery(query);
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
  }

  /** Lets pending promise callbacks run. */
  async function flush(): Promise<void> {
    await vi.advanceTimersByTimeAsync(0);
  }

  describe('initial state', () => {
    it('starts idle', () => {
      expect(controller.getState()).toEqual({ status: 'idle' });
    });
  });

  describe('empty input', () => {
    it.each(['', '   '])('does not search for %j and stays idle', async (query) => {
      await typeAndWait(query);

      expect(search).not.toHaveBeenCalled();
      expect(controller.getState()).toEqual({ status: 'idle' });
    });

    it('clears shown results when the input is cleared', async () => {
      await typeAndWait('spain');
      call(0).settle(results);
      await flush();

      controller.setQuery('');

      expect(controller.getState()).toEqual({ status: 'idle' });
    });
  });

  describe('debounce', () => {
    it('shows loading right away but does not search before the delay', async () => {
      controller.setQuery('spain');
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 1);

      expect(controller.getState()).toEqual({ status: 'loading', query: 'spain' });
      expect(search).not.toHaveBeenCalled();
    });

    it('searches once after the delay with the trimmed query and a signal', async () => {
      await typeAndWait('  spain ');

      expect(search).toHaveBeenCalledTimes(1);
      expect(call(0).query).toBe('spain');
      expect(call(0).signal).toBeInstanceOf(AbortSignal);
    });

    it('sends only the last query of a fast burst', async () => {
      controller.setQuery('s');
      controller.setQuery('sp');
      controller.setQuery('spa');
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);

      expect(search).toHaveBeenCalledTimes(1);
      expect(call(0).query).toBe('spa');
    });
  });

  describe('outcomes', () => {
    it('shows results', async () => {
      await typeAndWait('spain');
      call(0).settle(results);
      await flush();

      expect(controller.getState()).toEqual({ status: 'results', query: 'spain', countries });
    });

    it('shows "nothing found" for an empty outcome', async () => {
      await typeAndWait('zzzz');
      call(0).settle({ type: 'empty' });
      await flush();

      expect(controller.getState()).toEqual({ status: 'empty', query: 'zzzz' });
    });

    it('shows a real error with its reason and message', async () => {
      await typeAndWait('spain');
      call(0).settle(serverError);
      await flush();

      expect(controller.getState()).toEqual({
        status: 'error',
        query: 'spain',
        reason: 'http',
        message: 'Server error',
      });
    });

    it('reports every state change through onChange', async () => {
      await typeAndWait('spain');
      call(0).settle(results);
      await flush();

      expect(onChange.mock.calls.map(([state]) => state.status)).toEqual(['loading', 'results']);
    });
  });

  describe('cancellation', () => {
    it('aborts the in-flight request on the very next input, before the debounce fires', async () => {
      await typeAndWait('sp');

      controller.setQuery('spa');

      expect(call(0).signal.aborted).toBe(true);
      expect(search).toHaveBeenCalledTimes(1);
    });

    it('never shows our own cancellation as an error', async () => {
      await typeAndWait('sp');
      controller.setQuery('spa');
      await flush();

      expect(controller.getState()).toEqual({ status: 'loading', query: 'spa' });
      expect(onChange.mock.calls.some(([state]) => state.status === 'error')).toBe(false);
    });

    it('aborts the in-flight request when the input is cleared', async () => {
      await typeAndWait('spain');

      controller.setQuery('');
      await flush();

      expect(call(0).signal.aborted).toBe(true);
      expect(controller.getState()).toEqual({ status: 'idle' });
    });

    it('drops a pending debounced search when the input is cleared', async () => {
      controller.setQuery('spain');
      controller.setQuery('');
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS * 2);

      expect(search).not.toHaveBeenCalled();
      expect(controller.getState()).toEqual({ status: 'idle' });
    });

    it('uses a new signal for every request', async () => {
      await typeAndWait('sp');
      await typeAndWait('spain');

      expect(call(1).signal).not.toBe(call(0).signal);
      expect(call(1).signal.aborted).toBe(false);
    });

    it('dispose() aborts the in-flight request and drops a pending one', async () => {
      await typeAndWait('sp');
      controller.setQuery('spain');

      controller.dispose();
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS * 2);

      expect(call(0).signal.aborted).toBe(true);
      expect(search).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry', () => {
    it('repeats the last entered query right away, without debounce', async () => {
      await typeAndWait('spain');
      call(0).settle(serverError);
      await flush();

      controller.retry();

      expect(search).toHaveBeenCalledTimes(2);
      expect(call(1).query).toBe('spain');
      expect(controller.getState()).toEqual({ status: 'loading', query: 'spain' });
    });

    it('shows the result of the repeated request', async () => {
      await typeAndWait('spain');
      call(0).settle(serverError);
      await flush();

      controller.retry();
      call(1).settle(results);
      await flush();

      expect(controller.getState()).toEqual({ status: 'results', query: 'spain', countries });
    });

    it('uses the latest input even if it has not been sent yet', async () => {
      await typeAndWait('spain');
      call(0).settle(serverError);
      await flush();
      controller.setQuery('peru');

      controller.retry();
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS * 2);

      expect(calls.map(({ query }) => query)).toEqual(['spain', 'peru']);
    });

    it('aborts a request that is still in flight before repeating', async () => {
      await typeAndWait('spain');

      controller.retry();

      expect(call(0).signal.aborted).toBe(true);
      expect(call(1).query).toBe('spain');
    });

    it('does nothing for an empty input', async () => {
      await typeAndWait('');

      controller.retry();

      expect(search).not.toHaveBeenCalled();
      expect(controller.getState()).toEqual({ status: 'idle' });
    });
  });
});

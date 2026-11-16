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

  it('does not search for an empty input and stays idle', async () => {
    await typeAndWait('   ');

    expect(search).not.toHaveBeenCalled();
    expect(controller.getState()).toEqual({ status: 'idle' });
  });

  it('shows loading right away and sends only the last query of a burst after the delay', async () => {
    controller.setQuery('s');
    controller.setQuery('sp');
    controller.setQuery('spa');

    expect(controller.getState()).toEqual({ status: 'loading', query: 'spa' });
    expect(search).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);

    expect(search).toHaveBeenCalledTimes(1);
    expect(call(0).query).toBe('spa');
  });

  it.each<[SearchOutcome, SearchState]>([
    [
      { type: 'results', countries },
      { status: 'results', query: 'spain', countries },
    ],
    [{ type: 'empty' }, { status: 'empty', query: 'spain' }],
    [
      { type: 'error', reason: 'http', status: 500, message: 'Server error' },
      { status: 'error', query: 'spain', reason: 'http', message: 'Server error' },
    ],
  ])('turns outcome %o into state %o', async (outcome, expected) => {
    await typeAndWait('spain');
    call(0).settle(outcome);
    await flush();

    expect(controller.getState()).toEqual(expected);
  });

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

    expect(onChange.mock.calls.some(([state]) => state.status === 'error')).toBe(false);
  });

  it('aborts the in-flight request when the input is cleared', async () => {
    await typeAndWait('spain');

    controller.setQuery('');
    await flush();

    expect(call(0).signal.aborted).toBe(true);
    expect(controller.getState()).toEqual({ status: 'idle' });
  });

  it('retry() repeats the last entered query right away', async () => {
    await typeAndWait('spain');
    call(0).settle({ type: 'error', reason: 'network', message: 'Network error' });
    await flush();

    controller.retry();

    expect(search).toHaveBeenCalledTimes(2);
    expect(call(1).query).toBe('spain');
    expect(controller.getState()).toEqual({ status: 'loading', query: 'spain' });
  });
});

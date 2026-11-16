import antarcticaResponse from '../test/fixtures/antarctica.json' with { type: 'json' };
import spainResponse from '../test/fixtures/spain.json' with { type: 'json' };
import { mapCountryResponse } from '../api/map-country-response.js';
import { createFetchMock, jsonResponse } from '../test/fetch-mock.js';
import { createSearchController, SEARCH_DEBOUNCE_MS } from './search-controller.js';

describe('race of stale responses', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows only the latest query when an earlier response arrives later', async () => {
    // fetch mock rejects with AbortError when its signal is aborted before it settles,
    // so a stale response can only be dropped by a real abort(), not by ignoring it.
    const { fetchMock, requests } = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    const controller = createSearchController({ onChange: () => undefined });

    controller.setQuery('sp');
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);

    const [staleRequest, latestRequest] = requests;
    if (!staleRequest || !latestRequest) throw new Error('expected two requests');

    // The later request resolves first...
    latestRequest.respond(jsonResponse(spainResponse));
    await vi.advanceTimersByTimeAsync(0);
    // ...and the earlier one tries to resolve afterwards with different data.
    staleRequest.respond(jsonResponse(antarcticaResponse));
    await vi.advanceTimersByTimeAsync(0);

    expect(staleRequest.signal?.aborted).toBe(true);
    await expect(fetchMock.mock.results[0]?.value).rejects.toMatchObject({ name: 'AbortError' });
    expect(controller.getState()).toEqual({
      status: 'results',
      query: 'spain',
      countries: spainResponse.map(mapCountryResponse),
    });

    controller.dispose();
  });
});

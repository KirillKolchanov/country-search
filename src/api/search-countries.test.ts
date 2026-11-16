import spainResponse from '../test/fixtures/spain.json' with { type: 'json' };
import { createFetchMock, jsonResponse, textResponse } from '../test/fetch-mock.js';
import type { PendingRequest } from '../test/fetch-mock.js';
import { HttpError } from './http-error.js';
import { mapCountryResponse } from './map-country-response.js';
import { API_BASE_URL, SEARCH_TIMEOUT_MS, searchCountries } from './search-countries.js';

describe('searchCountries', () => {
  let requests: PendingRequest[];

  beforeEach(() => {
    const mock = createFetchMock();
    requests = mock.requests;
    vi.stubGlobal('fetch', mock.fetchMock);
  });

  function lastRequest(): PendingRequest {
    const request = requests.at(-1);
    if (!request) throw new Error('fetch was not called');
    return request;
  }

  /** Lets the pending `fetch` promise register before the test settles it. */
  async function flush(): Promise<void> {
    await Promise.resolve();
  }

  it('requests the name endpoint with the trimmed, encoded query', async () => {
    void searchCountries('  united states ', new AbortController().signal).catch(() => undefined);
    await flush();

    expect(lastRequest().url).toBe(`${API_BASE_URL}/name/united%20states`);
  });

  it('resolves with mapped countries', async () => {
    const result = searchCountries('spain', new AbortController().signal);
    await flush();
    lastRequest().respond(jsonResponse(spainResponse));

    await expect(result).resolves.toEqual(spainResponse.map(mapCountryResponse));
  });

  it('resolves with [] for 404 ("no matches" is not an error)', async () => {
    const result = searchCountries('zzzz', new AbortController().signal);
    await flush();
    lastRequest().respond(textResponse('Country not found', 404));

    await expect(result).resolves.toEqual([]);
  });

  it('rejects with HttpError for other unsuccessful statuses', async () => {
    const result = searchCountries('spain', new AbortController().signal);
    await flush();
    lastRequest().respond(textResponse('Internal error', 500));

    await expect(result).rejects.toBeInstanceOf(HttpError);
    await expect(result).rejects.toMatchObject({ status: 500 });
  });

  it('passes a network error through unchanged', async () => {
    const networkError = new TypeError('Failed to fetch');
    const result = searchCountries('spain', new AbortController().signal);
    await flush();
    lastRequest().fail(networkError);

    await expect(result).rejects.toBe(networkError);
  });

  it('really aborts fetch and rejects with AbortError when the signal is aborted', async () => {
    const controller = new AbortController();
    const result = searchCountries('spain', controller.signal);
    await flush();

    controller.abort();

    expect(lastRequest().signal?.aborted).toBe(true);
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });

  describe('timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('rejects with TimeoutError after SEARCH_TIMEOUT_MS', async () => {
      const result = searchCountries('spain', new AbortController().signal);
      result.catch(() => undefined);
      await flush();

      await vi.advanceTimersByTimeAsync(SEARCH_TIMEOUT_MS - 1);
      expect(lastRequest().signal?.aborted).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      await expect(result).rejects.toMatchObject({ name: 'TimeoutError' });
    });

    it('still reports our own cancellation as AbortError, not TimeoutError', async () => {
      const controller = new AbortController();
      const result = searchCountries('spain', controller.signal);
      await flush();

      controller.abort();

      await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    });
  });
});

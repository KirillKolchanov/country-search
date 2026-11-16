import cookIslandsResponse from '../test/fixtures/cook-islands.json' with { type: 'json' };
import spainResponse from '../test/fixtures/spain.json' with { type: 'json' };
import { createFetchMock, jsonResponse, textResponse } from '../test/fetch-mock.js';
import type { PendingRequest } from '../test/fetch-mock.js';
import { HttpError } from './http-error.js';
import { mapCountryResponse } from './map-country-response.js';
import { API_BASE_URL, SEARCH_TIMEOUT_MS, searchCountries } from './search-countries.js';

/** Short real timeout: `AbortSignal.timeout` is not driven by fake timers. */
const TEST_TIMEOUT_MS = 10;
/** Upper bound for tests that wait for the timeout, so a missing timeout fails fast. */
const FAIL_FAST_MS = 500;

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

  describe('request', () => {
    it('calls the name endpoint with the query', async () => {
      void searchCountries('spain', new AbortController().signal).catch(() => undefined);
      await flush();

      expect(requests).toHaveLength(1);
      expect(lastRequest().url).toBe(`${API_BASE_URL}/name/spain`);
    });

    it('encodes the query and trims surrounding spaces', async () => {
      void searchCountries('  united states ', new AbortController().signal).catch(() => undefined);
      await flush();

      expect(lastRequest().url).toBe(`${API_BASE_URL}/name/united%20states`);
    });

    it('passes a signal to fetch', async () => {
      void searchCountries('spain', new AbortController().signal).catch(() => undefined);
      await flush();

      expect(lastRequest().signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('successful response', () => {
    it('resolves with mapped countries', async () => {
      const result = searchCountries('spain', new AbortController().signal);
      await flush();
      lastRequest().respond(jsonResponse(spainResponse));

      await expect(result).resolves.toEqual(spainResponse.map(mapCountryResponse));
    });

    it('keeps every country in API order', async () => {
      const response = [...spainResponse, ...cookIslandsResponse];
      const result = searchCountries('a', new AbortController().signal);
      await flush();
      lastRequest().respond(jsonResponse(response));

      const countries = await result;

      expect(countries.map((country) => country.name)).toEqual(['Spain', 'Cook Islands']);
    });
  });

  describe('404 means "no matches"', () => {
    it('resolves with an empty array instead of throwing', async () => {
      const result = searchCountries('zzzz', new AbortController().signal);
      await flush();
      lastRequest().respond(textResponse('Country not found', 404));

      await expect(result).resolves.toEqual([]);
    });
  });

  describe('unsuccessful status', () => {
    it.each([400, 429, 500, 503])('rejects with HttpError for status %i', async (status) => {
      const result = searchCountries('spain', new AbortController().signal);
      await flush();
      lastRequest().respond(textResponse('Something went wrong', status));

      await expect(result).rejects.toBeInstanceOf(HttpError);
      await expect(result).rejects.toMatchObject({ status });
    });
  });

  describe('network failure', () => {
    it('rejects with the original error, not HttpError', async () => {
      const networkError = new TypeError('Failed to fetch');
      const result = searchCountries('spain', new AbortController().signal);
      await flush();
      lastRequest().fail(networkError);

      await expect(result).rejects.toBe(networkError);
    });
  });

  describe('cancellation', () => {
    it('rejects with AbortError when the signal is aborted mid-flight', async () => {
      const controller = new AbortController();
      const result = searchCountries('spain', controller.signal);
      await flush();

      controller.abort();

      await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('really aborts the underlying fetch', async () => {
      const controller = new AbortController();
      void searchCountries('spain', controller.signal).catch(() => undefined);
      await flush();

      controller.abort();

      expect(lastRequest().signal?.aborted).toBe(true);
    });

    it('rejects with AbortError for an already aborted signal', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(searchCountries('spain', controller.signal)).rejects.toMatchObject({
        name: 'AbortError',
      });
    });

    it('ignores a response that arrives after abort', async () => {
      const controller = new AbortController();
      const result = searchCountries('spain', controller.signal);
      await flush();
      const request = lastRequest();

      controller.abort();
      request.respond(jsonResponse(spainResponse));

      await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    });
  });

  describe('timeout', () => {
    describe('with fake timers', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it(
        'times out after SEARCH_TIMEOUT_MS by default',
        async () => {
          const result = searchCountries('spain', new AbortController().signal);
          result.catch(() => undefined);
          await flush();

          await vi.advanceTimersByTimeAsync(SEARCH_TIMEOUT_MS - 1);
          expect(lastRequest().signal?.aborted).toBe(false);

          await vi.advanceTimersByTimeAsync(1);
          await expect(result).rejects.toMatchObject({ name: 'TimeoutError' });
        },
        FAIL_FAST_MS,
      );

      it('leaves no pending timer once the response has arrived', async () => {
        const result = searchCountries('spain', new AbortController().signal);
        await flush();
        lastRequest().respond(jsonResponse(spainResponse));
        await result;

        expect(vi.getTimerCount()).toBe(0);
      });

      it('leaves no pending timer after our own cancellation', async () => {
        const controller = new AbortController();
        const result = searchCountries('spain', controller.signal);
        await flush();

        controller.abort();
        await result.catch(() => undefined);

        expect(vi.getTimerCount()).toBe(0);
      });
    });

    it(
      'rejects with TimeoutError when the server does not answer in time',
      async () => {
        const result = searchCountries('spain', new AbortController().signal, {
          timeoutMs: TEST_TIMEOUT_MS,
        });

        await expect(result).rejects.toMatchObject({ name: 'TimeoutError' });
      },
      FAIL_FAST_MS,
    );

    it(
      'aborts the underlying fetch on timeout',
      async () => {
        const result = searchCountries('spain', new AbortController().signal, {
          timeoutMs: TEST_TIMEOUT_MS,
        });
        await result.catch(() => undefined);

        expect(lastRequest().signal?.aborted).toBe(true);
      },
      FAIL_FAST_MS,
    );

    it('still reports our own cancellation as AbortError, not TimeoutError', async () => {
      const controller = new AbortController();
      const result = searchCountries('spain', controller.signal, { timeoutMs: TEST_TIMEOUT_MS });
      await flush();

      controller.abort();

      await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('does not fail a response that arrives before the timeout', async () => {
      const result = searchCountries('spain', new AbortController().signal, {
        timeoutMs: TEST_TIMEOUT_MS * 100,
      });
      await flush();
      lastRequest().respond(jsonResponse(spainResponse));

      await expect(result).resolves.toHaveLength(1);
    });
  });
});

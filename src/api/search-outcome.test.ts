import spainResponse from '../test/fixtures/spain.json' with { type: 'json' };
import { createFetchMock, jsonResponse, textResponse } from '../test/fetch-mock.js';
import type { PendingRequest } from '../test/fetch-mock.js';
import { HttpError } from './http-error.js';
import { mapCountryResponse } from './map-country-response.js';
import { classifySearchError, runSearch } from './search-outcome.js';

const abortError = (): DOMException => new DOMException('The operation was aborted.', 'AbortError');
const timeoutError = (): DOMException =>
  new DOMException('The operation timed out.', 'TimeoutError');

describe('classifySearchError', () => {
  describe('our own cancellation', () => {
    it('treats AbortError as cancelled, not as an error', () => {
      expect(classifySearchError(abortError())).toEqual({ type: 'cancelled' });
    });

    it('recognises the reason of a real aborted controller', () => {
      const controller = new AbortController();
      controller.abort();

      expect(classifySearchError(controller.signal.reason)).toEqual({ type: 'cancelled' });
    });
  });

  describe('timeout', () => {
    it('treats TimeoutError as a real error', () => {
      expect(classifySearchError(timeoutError())).toMatchObject({
        type: 'error',
        reason: 'timeout',
      });
    });

    it('does not confuse TimeoutError with AbortError', () => {
      expect(classifySearchError(timeoutError())).not.toEqual(classifySearchError(abortError()));
    });
  });

  describe('HTTP errors', () => {
    it('treats 404 as "no matches", not as an error', () => {
      expect(classifySearchError(new HttpError(404))).toEqual({ type: 'empty' });
    });

    it.each([400, 429, 500, 503])('treats status %i as an http error', (status) => {
      expect(classifySearchError(new HttpError(status))).toMatchObject({
        type: 'error',
        reason: 'http',
        status,
      });
    });

    it('mentions the status in the message', () => {
      const outcome = classifySearchError(new HttpError(503));

      expect(outcome.type === 'error' && outcome.message).toContain('503');
    });
  });

  describe('network and unknown errors', () => {
    it('treats a failed fetch (TypeError) as a network error', () => {
      expect(classifySearchError(new TypeError('Failed to fetch'))).toMatchObject({
        type: 'error',
        reason: 'network',
      });
    });

    it.each([new Error('boom'), 'boom', undefined])('treats %s as an unknown error', (value) => {
      expect(classifySearchError(value)).toMatchObject({ type: 'error', reason: 'unknown' });
    });
  });

  it('gives every real error a non-empty message for the user', () => {
    const errors = [timeoutError(), new HttpError(500), new TypeError('x'), new Error('x')];

    for (const error of errors) {
      const outcome = classifySearchError(error);
      expect(outcome.type).toBe('error');
      expect(outcome.type === 'error' && outcome.message.length).toBeGreaterThan(0);
    }
  });
});

describe('runSearch', () => {
  let requests: PendingRequest[];

  beforeEach(() => {
    const mock = createFetchMock();
    requests = mock.requests;
    vi.stubGlobal('fetch', mock.fetchMock);
  });

  async function settleLastRequest(settle: (request: PendingRequest) => void): Promise<void> {
    await Promise.resolve();
    const request = requests.at(-1);
    if (!request) throw new Error('fetch was not called');
    settle(request);
  }

  it('returns results for a successful response', async () => {
    const outcome = runSearch('spain', new AbortController().signal);
    await settleLastRequest((request) => {
      request.respond(jsonResponse(spainResponse));
    });

    await expect(outcome).resolves.toEqual({
      type: 'results',
      countries: spainResponse.map(mapCountryResponse),
    });
  });

  it('returns empty for 404', async () => {
    const outcome = runSearch('zzzz', new AbortController().signal);
    await settleLastRequest((request) => {
      request.respond(textResponse('Country not found', 404));
    });

    await expect(outcome).resolves.toEqual({ type: 'empty' });
  });

  it('returns an http error for 500 instead of rejecting', async () => {
    const outcome = runSearch('spain', new AbortController().signal);
    await settleLastRequest((request) => {
      request.respond(textResponse('Internal error', 500));
    });

    await expect(outcome).resolves.toMatchObject({ type: 'error', reason: 'http', status: 500 });
  });

  it('returns a network error when fetch fails', async () => {
    const outcome = runSearch('spain', new AbortController().signal);
    await settleLastRequest((request) => {
      request.fail(new TypeError('Failed to fetch'));
    });

    await expect(outcome).resolves.toMatchObject({ type: 'error', reason: 'network' });
  });

  it('returns cancelled when we abort the request', async () => {
    const controller = new AbortController();
    const outcome = runSearch('spain', controller.signal);
    await Promise.resolve();

    controller.abort();

    await expect(outcome).resolves.toEqual({ type: 'cancelled' });
  });

  it('returns a timeout error when the server is too slow', async () => {
    const outcome = runSearch('spain', new AbortController().signal, { timeoutMs: 10 });

    await expect(outcome).resolves.toMatchObject({ type: 'error', reason: 'timeout' });
  });
});

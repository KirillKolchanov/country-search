import spainResponse from '../test/fixtures/spain.json' with { type: 'json' };
import { createFetchMock, jsonResponse, textResponse } from '../test/fetch-mock.js';
import type { PendingRequest } from '../test/fetch-mock.js';
import { HttpError } from './http-error.js';
import { mapCountryResponse } from './map-country-response.js';
import { classifySearchError, runSearch } from './search-outcome.js';

describe('classifySearchError', () => {
  it('treats AbortError (our own cancellation) as cancelled, not as an error', () => {
    const controller = new AbortController();
    controller.abort();

    expect(classifySearchError(controller.signal.reason)).toEqual({ type: 'cancelled' });
  });

  it('treats TimeoutError as a real timeout error', () => {
    const error = new DOMException('The operation timed out.', 'TimeoutError');

    expect(classifySearchError(error)).toMatchObject({ type: 'error', reason: 'timeout' });
  });

  it('treats HttpError 404 as "no matches", not as an error', () => {
    expect(classifySearchError(new HttpError(404))).toEqual({ type: 'empty' });
  });

  it('treats other HttpError statuses as http errors', () => {
    expect(classifySearchError(new HttpError(500))).toMatchObject({
      type: 'error',
      reason: 'http',
      status: 500,
    });
  });

  it('treats a failed fetch (TypeError) as a network error', () => {
    expect(classifySearchError(new TypeError('Failed to fetch'))).toMatchObject({
      type: 'error',
      reason: 'network',
    });
  });

  it('treats anything else as an unknown error', () => {
    expect(classifySearchError(new Error('boom'))).toMatchObject({
      type: 'error',
      reason: 'unknown',
    });
  });
});

describe('runSearch', () => {
  let requests: PendingRequest[];

  beforeEach(() => {
    const mock = createFetchMock();
    requests = mock.requests;
    vi.stubGlobal('fetch', mock.fetchMock);
  });

  async function respond(response: Response): Promise<void> {
    await Promise.resolve();
    requests.at(-1)?.respond(response);
  }

  it('returns results for a successful response', async () => {
    const outcome = runSearch('spain', new AbortController().signal);
    await respond(jsonResponse(spainResponse));

    await expect(outcome).resolves.toEqual({
      type: 'results',
      countries: spainResponse.map(mapCountryResponse),
    });
  });

  it('returns an outcome instead of rejecting on errors', async () => {
    const outcome = runSearch('spain', new AbortController().signal);
    await respond(textResponse('Internal error', 500));

    await expect(outcome).resolves.toMatchObject({ type: 'error', reason: 'http', status: 500 });
  });
});

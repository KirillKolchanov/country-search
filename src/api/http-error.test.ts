import { HttpError } from './http-error.js';

describe('HttpError', () => {
  it('is an Error', () => {
    const error = new HttpError(500);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HttpError);
  });

  it('stores the response status', () => {
    expect(new HttpError(503).status).toBe(503);
  });

  it('has its own name', () => {
    expect(new HttpError(500).name).toBe('HttpError');
  });

  it('mentions the status in the message', () => {
    expect(new HttpError(429).message).toContain('429');
  });
});

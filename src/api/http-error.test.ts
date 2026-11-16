import { HttpError } from './http-error.js';

describe('HttpError', () => {
  it('is an Error that stores the response status', () => {
    const error = new HttpError(503);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('HttpError');
    expect(error.status).toBe(503);
  });
});

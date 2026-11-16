/** Thrown for unsuccessful HTTP responses that are not "no matches" (404). */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Request failed with status ${String(status)}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

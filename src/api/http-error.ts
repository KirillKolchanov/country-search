/** Thrown for unsuccessful HTTP responses that are not "no matches" (404). */
export class HttpError extends Error {
  readonly status: number;

  constructor(_status: number) {
    super('Not implemented');
    this.status = 0;
  }
}

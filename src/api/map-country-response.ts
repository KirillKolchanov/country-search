import type { Country } from '../domain/country.js';
import type { RawCountry } from './types.js';

export function mapCountryResponse(_raw: RawCountry): Country {
  throw new Error('Not implemented');
}

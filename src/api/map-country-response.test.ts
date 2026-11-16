import antarcticaResponse from '../test/fixtures/antarctica.json' with { type: 'json' };
import spainResponse from '../test/fixtures/spain.json' with { type: 'json' };
import { mapCountryResponse } from './map-country-response.js';
import type { RawCountry } from './types.js';

function firstCountry(response: RawCountry[]): RawCountry {
  const [country] = response;
  if (!country) throw new Error('Fixture is empty');
  return structuredClone(country);
}

describe('mapCountryResponse', () => {
  it('maps a complete country (Spain)', () => {
    expect(mapCountryResponse(firstCountry(spainResponse))).toEqual({
      code: 'ESP',
      name: 'Spain',
      nativeName: 'España',
      flag: { emoji: '🇪🇸', imageUrl: 'https://flagcdn.com/es.svg', alt: 'Flag of Spain' },
      capital: 'Madrid',
      region: 'Europe',
      subregion: 'Southern Europe',
      population: 47351567,
      area: 505992,
      borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
      languages: ['Spanish'],
      currencies: ['Euro (EUR, €)'],
      description: 'Spain (España) is a sovereign country in Southern Europe.',
    });
  });

  it('handles missing capital, borders and currencies (Antarctica)', () => {
    const country = mapCountryResponse(firstCountry(antarcticaResponse));

    expect(country.capital).toBeNull();
    expect(country.borders).toEqual([]);
    expect(country.currencies).toEqual([]);
    expect(country.nativeName).toBeNull();
    expect(country.description).toBe('Antarctica is a territory in Antarctica.');
  });

  it('does not mutate the input', () => {
    const raw = firstCountry(spainResponse);
    const snapshot = structuredClone(raw);

    mapCountryResponse(raw);

    expect(raw).toEqual(snapshot);
  });
});

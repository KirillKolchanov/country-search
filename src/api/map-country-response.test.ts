import antarcticaResponse from '../test/fixtures/antarctica.json' with { type: 'json' };
import cookIslandsResponse from '../test/fixtures/cook-islands.json' with { type: 'json' };
import spainResponse from '../test/fixtures/spain.json' with { type: 'json' };
import minorIslandsResponse from '../test/fixtures/us-minor-outlying-islands.json' with { type: 'json' };
import { mapCountryResponse } from './map-country-response.js';
import type { RawCountry } from './types.js';

function firstCountry(response: RawCountry[]): RawCountry {
  const [country] = response;
  if (!country) throw new Error('Fixture is empty');
  return structuredClone(country);
}

const spain = (): RawCountry => firstCountry(spainResponse);
const antarctica = (): RawCountry => firstCountry(antarcticaResponse);
const cookIslands = (): RawCountry => firstCountry(cookIslandsResponse);
const minorIslands = (): RawCountry => firstCountry(minorIslandsResponse);

describe('mapCountryResponse', () => {
  describe('with a complete country (Spain)', () => {
    it('maps card fields', () => {
      const country = mapCountryResponse(spain());

      expect(country).toMatchObject({
        code: 'ESP',
        name: 'Spain',
        nativeName: 'España',
        capital: 'Madrid',
        region: 'Europe',
        subregion: 'Southern Europe',
        population: 47351567,
      });
    });

    it('maps the flag, preferring the SVG image', () => {
      const { flag } = mapCountryResponse(spain());

      expect(flag).toEqual({
        emoji: '🇪🇸',
        imageUrl: 'https://flagcdn.com/es.svg',
        alt: 'Flag of Spain',
      });
    });

    it('maps details fields', () => {
      const country = mapCountryResponse(spain());

      expect(country.area).toBe(505992);
      expect(country.borders).toEqual(['AND', 'FRA', 'GIB', 'PRT', 'MAR']);
      expect(country.languages).toEqual(['Spanish']);
      expect(country.currencies).toEqual(['Euro (EUR, €)']);
    });

    it('builds a description from region and status', () => {
      const { description } = mapCountryResponse(spain());

      expect(description).toBe('Spain (España) is a sovereign country in Southern Europe.');
    });
  });

  describe('with several languages and currencies (Cook Islands)', () => {
    it('keeps every language and currency in API order', () => {
      const country = mapCountryResponse(cookIslands());

      expect(country.languages).toEqual(['English', 'Cook Islands Māori']);
      expect(country.currencies).toEqual([
        'New Zealand dollar (NZD, $)',
        'Cook Islands dollar (CKD, $)',
      ]);
    });

    it('drops nativeName when it equals the name', () => {
      const country = mapCountryResponse(cookIslands());

      expect(country.nativeName).toBeNull();
      expect(country.description).toBe('Cook Islands is a sovereign country in Polynesia.');
    });
  });

  describe('with missing optional fields', () => {
    it('maps a territory without capital, borders and currencies (Antarctica)', () => {
      const country = mapCountryResponse(antarctica());

      expect(country.capital).toBeNull();
      expect(country.borders).toEqual([]);
      expect(country.currencies).toEqual([]);
      expect(country.description).toBe('Antarctica is a territory in Antarctica.');
    });

    it('maps a territory without area (US Minor Outlying Islands)', () => {
      const country = mapCountryResponse(minorIslands());

      expect(country.area).toBeNull();
      expect(country.capital).toBeNull();
      expect(country.population).toBe(300);
    });

    it('falls back to safe defaults for a minimal object', () => {
      const country = mapCountryResponse({ name: 'Nowhere', alpha3Code: 'NWH' });

      expect(country).toEqual({
        code: 'NWH',
        name: 'Nowhere',
        nativeName: null,
        flag: { emoji: '', imageUrl: null, alt: 'Flag of Nowhere' },
        capital: null,
        region: null,
        subregion: null,
        population: 0,
        area: null,
        borders: [],
        languages: [],
        currencies: [],
        description: 'Nowhere is a country.',
      });
    });

    it('uses the PNG flag when there is no SVG', () => {
      const raw = spain();
      raw.flags = { png: 'https://flagcdn.com/w320/es.png' };

      expect(mapCountryResponse(raw).flag.imageUrl).toBe('https://flagcdn.com/w320/es.png');
    });

    it('treats an empty capital string as missing', () => {
      const raw = spain();
      raw.capital = '';

      expect(mapCountryResponse(raw).capital).toBeNull();
    });

    it('formats a currency without a symbol', () => {
      const raw = spain();
      raw.currencies = [{ code: 'XXX', name: 'Test unit' }];

      expect(mapCountryResponse(raw).currencies).toEqual(['Test unit (XXX)']);
    });

    it('falls back to the region when there is no subregion', () => {
      const raw = spain();
      delete raw.subregion;

      expect(mapCountryResponse(raw).description).toBe(
        'Spain (España) is a sovereign country in Europe.',
      );
    });
  });

  describe('purity', () => {
    it('does not mutate the input', () => {
      const raw = spain();
      const snapshot = structuredClone(raw);

      mapCountryResponse(raw);

      expect(raw).toEqual(snapshot);
    });

    it('returns arrays that are not shared with the input', () => {
      const raw = spain();

      const country = mapCountryResponse(raw);
      country.borders.push('XXX');

      expect(raw.borders).not.toContain('XXX');
    });

    it('returns equal results for equal input', () => {
      expect(mapCountryResponse(spain())).toEqual(mapCountryResponse(spain()));
    });
  });
});

import type { Country } from '../domain/country.js';
import type { RawCountry, RawCurrency } from './types.js';

/** Turns empty or missing strings into `null`. */
function textOrNull(value: string | undefined): string | null {
  return value ? value : null;
}

function formatCurrency({ name, code, symbol }: RawCurrency): string {
  const details = symbol ? `${code}, ${symbol}` : code;
  return `${name} (${details})`;
}

function describeStatus(independent: boolean | undefined): string {
  if (independent === undefined) return 'a country';
  return independent ? 'a sovereign country' : 'a territory';
}

function buildDescription(
  name: string,
  nativeName: string | null,
  location: string | null,
  independent: boolean | undefined,
): string {
  const title = nativeName ? `${name} (${nativeName})` : name;
  const kind = describeStatus(independent);
  const place = location ? ` in ${location}` : '';
  return `${title} is ${kind}${place}.`;
}

/**
 * Pure mapper from the countries.dev response item to the UI model.
 * Never mutates `raw`; all arrays in the result are new.
 */
export function mapCountryResponse(raw: RawCountry): Country {
  const nativeName = raw.nativeName && raw.nativeName !== raw.name ? raw.nativeName : null;
  const region = textOrNull(raw.region);
  const subregion = textOrNull(raw.subregion);

  return {
    code: raw.alpha3Code,
    name: raw.name,
    nativeName,
    flag: {
      emoji: raw.flag ?? '',
      imageUrl: raw.flags?.svg ?? raw.flags?.png ?? null,
      alt: `Flag of ${raw.name}`,
    },
    capital: textOrNull(raw.capital),
    region,
    subregion,
    population: raw.population ?? 0,
    area: raw.area ?? null,
    borders: [...(raw.borders ?? [])],
    languages: (raw.languages ?? []).map((language) => language.name),
    currencies: (raw.currencies ?? []).map(formatCurrency),
    description: buildDescription(raw.name, nativeName, subregion ?? region, raw.independent),
  };
}

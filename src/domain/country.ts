/** Country data prepared for the card and the details view. */
export interface Country {
  /** ISO 3166-1 alpha-3 code, stable id of the country. */
  code: string;
  name: string;
  /** `null` when it is missing or equals `name`. */
  nativeName: string | null;
  flag: {
    emoji: string;
    /** SVG if available, otherwise PNG, otherwise `null`. */
    imageUrl: string | null;
    alt: string;
  };
  capital: string | null;
  region: string | null;
  subregion: string | null;
  population: number;
  /** Square kilometres, `null` when unknown. */
  area: number | null;
  /** Alpha-3 codes of neighbouring countries. */
  borders: string[];
  /** Language names, e.g. `['Spanish']`. */
  languages: string[];
  /** Human-readable currencies, e.g. `['Euro (EUR, €)']`. */
  currencies: string[];
  /** Short sentence built from the API data (the API has no description field). */
  description: string;
}

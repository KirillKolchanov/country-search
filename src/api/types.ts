/** Shape of a single country as returned by `GET https://countries.dev/name/{query}`. */
export interface RawLanguage {
  name: string;
  nativeName?: string;
  iso639_1?: string;
  iso639_2?: string;
}

export interface RawCurrency {
  code: string;
  name: string;
  symbol?: string;
}

export interface RawCountry {
  name: string;
  alpha3Code: string;
  nativeName?: string;
  flag?: string;
  flags?: { png?: string; svg?: string };
  capital?: string;
  region?: string;
  subregion?: string;
  population?: number;
  area?: number;
  borders?: string[];
  languages?: RawLanguage[];
  currencies?: RawCurrency[];
  independent?: boolean;
}

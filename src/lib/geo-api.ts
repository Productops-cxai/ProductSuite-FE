/**
 * Geo lookups via PayFlow backend.
 * Countries are bundled server-side; provinces/cities proxy countriesnow.space.
 */

import { apiRequest } from "../api/client";

type CountryRow = {
  name: string;
  currencies: string[];
  languages: string[];
};

const countryMetaCache = new Map<string, { currencies: string[]; languages: string[] }>();
const statesCache = new Map<string, string[]>();
const citiesCache = new Map<string, string[]>();

let countriesPromise: Promise<string[]> | null = null;

function cacheKey(...parts: string[]) {
  return parts.map((p) => p.trim().toLowerCase()).join("||");
}

export async function fetchCountryNames(): Promise<string[]> {
  if (!countriesPromise) {
    countriesPromise = (async () => {
      const res = await apiRequest<{ countries: CountryRow[] }>("/payflow/geo/countries");
      const names: string[] = [];
      for (const row of res.countries || []) {
        const name = (row.name || "").trim();
        if (!name) continue;
        names.push(name);
        countryMetaCache.set(name.toLowerCase(), {
          currencies: row.currencies || [],
          languages: row.languages || [],
        });
      }
      return names;
    })().catch((err) => {
      countriesPromise = null;
      throw err;
    });
  }
  return countriesPromise;
}

export function getCountryMeta(countryName: string): {
  currencies: string[];
  languages: string[];
} {
  return (
    countryMetaCache.get(countryName.trim().toLowerCase()) || {
      currencies: [],
      languages: [],
    }
  );
}

export async function fetchStates(countryName: string): Promise<string[]> {
  const key = cacheKey("state", countryName);
  const hit = statesCache.get(key);
  if (hit) return hit;

  const res = await apiRequest<{ states: string[] }>(
    `/payflow/geo/states?country=${encodeURIComponent(countryName)}`,
  );
  const states = res.states || [];
  statesCache.set(key, states);
  return states;
}

export async function fetchCities(countryName: string, stateName: string): Promise<string[]> {
  const key = cacheKey("city", countryName, stateName);
  const hit = citiesCache.get(key);
  if (hit) return hit;

  const res = await apiRequest<{ cities: string[] }>(
    `/payflow/geo/cities?country=${encodeURIComponent(countryName)}&state=${encodeURIComponent(stateName)}`,
  );
  const cities = res.cities || [];
  citiesCache.set(key, cities);
  return cities;
}

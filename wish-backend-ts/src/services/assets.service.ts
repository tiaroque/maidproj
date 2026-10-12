import * as iso from "i18n-iso-countries";

export let getNationalities = (language: string) => {
  return iso.getNames(language);
};

export const getCountriesByLanguage = (language: string) => {
  let countries = getNationalities(language);
  let list = Object.entries(countries).map((country) => ({
    value: country[0],
    name: country[1],
  }));

  return list;
};

const MERIDIAN_SEARCH_URL =
  "https://meridian-api.com/api/locations/search";

export interface MeridianLocationResult {
  display_name: string;
  title: string;
  subtitle: string;
  hierarchy_subtitle: string;
  region_type?: string;
  location: {
    id: number;
    name: string;
    lineage: string;
  };
}

export interface MeridianSearchResponse {
  query: string;
  language: string;
  total: number;
  results: MeridianLocationResult[];
}

export const searchLocation = async (
  language: string,
  searchString: string,
  limit = 10,
): Promise<MeridianSearchResponse> => {
  const url = new URL(MERIDIAN_SEARCH_URL);
  url.searchParams.set("q", searchString);
  url.searchParams.set("lang", language);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Meridian request failed with status ${response.status}`);
  }

  return (await response.json()) as MeridianSearchResponse;
};

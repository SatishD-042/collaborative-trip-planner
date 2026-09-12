export interface GeocodeResult {
  name: string;
  lat: number;
  lon: number;
}

export async function geocodePlace(query: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geocoding request failed: ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const match = data[0];
  const resolvedName = match.state
    ? `${match.name}, ${match.state}, ${match.country}`
    : `${match.name}, ${match.country}`;

  return { name: resolvedName, lat: match.lat, lon: match.lon };
}
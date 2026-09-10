import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const CACHE_TTL_SECONDS = 60 * 60 * 6; // 6 hours

export interface DailyForecast {
  date: string;
  tempMinC: number;
  tempMaxC: number;
  condition: string;
}

export interface WeatherForecast {
  latitude: number;
  longitude: number;
  daily: DailyForecast[];
}

function buildCacheKey(latitude: number, longitude: number): string {
  return `weather:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
}

export async function getWeatherForecast(
  latitude: number,
  longitude: number
): Promise<WeatherForecast> {
  const cacheKey = buildCacheKey(latitude, longitude);

  const cached = await redis.get<WeatherForecast>(cacheKey);
  if (cached) {
    return cached;
  }

  const forecast = await fetchFromOpenWeather(latitude, longitude);
  await redis.set(cacheKey, forecast, { ex: CACHE_TTL_SECONDS });

  return forecast;
}

interface OpenWeatherListItem {
  dt_txt: string;
  main: { temp_min: number; temp_max: number };
  weather: { description: string }[];
}

async function fetchFromOpenWeather(
  latitude: number,
  longitude: number
): Promise<WeatherForecast> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OpenWeatherMap request failed: ${response.status}`);
  }

  const data = await response.json();
  const list: OpenWeatherListItem[] = data.list;

  const byDate = new Map<string, OpenWeatherListItem[]>();
  for (const item of list) {
    const date = item.dt_txt.split(" ")[0]!;
    const existing = byDate.get(date) ?? [];
    existing.push(item);
    byDate.set(date, existing);
  }

  const daily: DailyForecast[] = Array.from(byDate.entries()).map(([date, items]) => {
    const tempMinC = Math.min(...items.map((i) => i.main.temp_min));
    const tempMaxC = Math.max(...items.map((i) => i.main.temp_max));
    const midday = items.find((i) => i.dt_txt.includes("12:00:00")) ?? items[0]!;
    const condition = midday.weather[0]?.description ?? "unknown";
    return { date, tempMinC, tempMaxC, condition };
  });

  return { latitude, longitude, daily };
}
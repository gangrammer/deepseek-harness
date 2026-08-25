/**
 * Open-Meteo implementation of the `ctx.weather` capability seam.
 *
 * The package is mounted alongside `@deepseek-ai/dsh-weather`; this provider
 * fills in `ctx.weatherProvider` so the seam forwards to a real backend.
 * Open-Meteo's current-weather endpoint is free and requires no API key.
 *
 * @module @deepseek-ai/dsh-weather-openmeteo
 */

import type { Context } from '@deepseek-ai/cordis'
import type {
  WeatherProvider,
  WeatherProviderResponse,
  WeatherQueryRequest,
  WeatherResult,
} from '@deepseek-ai/dsh-weather'

/** Tiny city → coordinate table. Real deployments swap this for a geocoder. */
const CITY_COORDS: Record<string, { lat: number; lon: number; name: string }> = {
  shanghai: { lat: 31.2304, lon: 121.4737, name: '上海' },
  beijing:  { lat: 39.9042, lon: 116.4074, name: '北京' },
  shenzhen: { lat: 22.5431, lon: 114.0579, name: '深圳' },
  guangzhou:{ lat: 23.1291, lon: 113.2644, name: '广州' },
  hangzhou: { lat: 30.2741, lon: 120.1551, name: '杭州' },
}

interface OpenMeteoCurrent {
  current: {
    temperature_2m: number
    relative_humidity_2m: number
    wind_speed_10m: number
  }
}

class OpenMeteoProvider implements WeatherProvider {
  constructor(private readonly timeoutMs: number) {}

  async query(request: WeatherQueryRequest): Promise<WeatherProviderResponse> {
    const key = request.city.toLowerCase().trim()
    const coords = CITY_COORDS[key]
    if (!coords) {
      return {
        ok: false,
        error: `Unknown city: ${request.city}. Supported: ${Object.keys(CITY_COORDS).join(', ')}`,
      }
    }
    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${coords.lat}&longitude=${coords.lon}` +
      '&current=temperature_2m,relative_humidity_2m,wind_speed_10m'

    let res: Response
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(this.timeoutMs) })
    } catch (e) {
      return { ok: false, error: `Open-Meteo fetch failed: ${(e as Error).message}` }
    }
    if (!res.ok) {
      return { ok: false, error: `Open-Meteo HTTP ${res.status}` }
    }

    const json = (await res.json()) as OpenMeteoCurrent
    const c = json.current
    const data: WeatherResult = {
      city: coords.name,
      temperature: c.temperature_2m,
      humidity: c.relative_humidity_2m,
      windSpeed: c.wind_speed_10m,
      description:
        `${coords.name}当前 ${c.temperature_2m}°C，湿度 ${c.relative_humidity_2m}%，风速 ${c.wind_speed_10m} km/h`,
    }
    return { ok: true, data }
  }
}

/** Cordis plugin shape: name for routing, inject for ordering, apply for hook. */
export const name = 'weather-openmeteo'
export const inject = ['weather']

export function apply(ctx: Context): void {
  const timeoutMs = 5_000
  // Cordis property proxy blocks plain assignment; ctx.provide registers the
  // provider under a stable key so the seam's optional lookup finds it.
  ctx.provide('weatherProvider', new OpenMeteoProvider(timeoutMs))
}

/**
 * Service Definition for the `ctx.weather` capability seam.
 * Concrete implementations live in sibling packages (e.g. `weather-openmeteo`);
 * a host composes exactly one provider of `ctx.weather` and consumers reach it
 * through this interface only.
 *
 * @module @deepseek-ai/dsh-weather
 */

import type { Context } from '@deepseek-ai/cordis'

/** Shape returned by every weather provider; consumer code can rely on it. */
export interface WeatherResult {
  /** Display name of the resolved city. */
  city: string
  /** Air temperature in degrees Celsius. */
  temperature: number
  /** Relative humidity, 0-100. */
  humidity: number
  /** Wind speed in km/h. */
  windSpeed: number
  /** Human-readable summary line, suitable for direct rendering to the user. */
  description: string
}

/** Argument passed by callers (model tools) when requesting weather. */
export interface WeatherQueryRequest {
  /** Free-form city name. Providers decide how to resolve it to coordinates. */
  city: string
}

/** Result returned by a provider — either success with data or a typed failure. */
export type WeatherProviderResponse =
  | { ok: true; data: WeatherResult }
  | { ok: false; error: string }

/** Contract every weather provider must implement; registered on ctx.weather. */
export interface WeatherProvider {
  query(request: WeatherQueryRequest): Promise<WeatherProviderResponse>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** The weather capability seam; consumers read this field. */
    weather: WeatherSeam
  }
}

/**
 * Capability seam exposed as `ctx.weather.query(...)`. The seam resolves the
 * active provider on each call so a host can swap providers without restart.
 */
export class WeatherSeam {
  constructor(private readonly ctx: Context) {}

  async query(city: string): Promise<WeatherProviderResponse> {
    // ctx.weatherProvider is registered by a sibling package such as
    // `@deepseek-ai/dsh-weather-openmeteo`. Reading through `ctx.get` keeps the
    // seam honest about optional dependency on a registered provider.
    const provider = this.ctx.get('weatherProvider') as WeatherProvider | undefined
    if (!provider) {
      return { ok: false, error: 'No weather provider registered (mount @deepseek-ai/dsh-weather-openmeteo or a sibling provider package)' }
    }
    return await provider.query({ city })
  }
}

/**
 * Cordis plugin shape: providers and consumers rely on `name` to opt into the
 * capability and `inject` to wait for the seam itself. The apply() hook
 * instantiates `WeatherSeam` and attaches it to ctx.weather; nothing more.
 */
export const name = 'weather'
export const inject: string[] = []

export function apply(ctx: Context): void {
  // Cordis property proxy blocks plain assignment; use ctx.provide so the
  // `ctx.weather` declaration-merged field resolves for the Consumer.
  ctx.provide('weather', new WeatherSeam(ctx))
}

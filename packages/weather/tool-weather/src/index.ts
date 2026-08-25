/**
 * Model-facing Consumer of the `ctx.weather` capability seam. Registers a
 * single tool the model can call by city name and forwards to whichever
 * provider backs the seam at runtime.
 *
 * @module @deepseek-ai/dsh-tool-weather
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-weather'  // ensures ctx.weather type augmentation loads

export const name = 'tool-weather'
// `weather` is the capability seam; `tools` is the registry this Consumer writes into.
// Both must be declared so the Loader resolves them before apply() runs.
export const inject = ['weather', 'tools']

export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'weather',
    description: '查询指定城市的当前天气，返回温度、湿度、风速。',
    parameters: {
      city: {
        type: 'string',
        required: true,
        description: '城市英文名或拼音，如 "shanghai"、"beijing"。',
      },
    },
    // 'json' = author-unconstrained lossless JSON; lets execute return any plain object.
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute: async (args, _exec) => {
      const city = typeof args.city === 'string' ? args.city : ''
      if (city.length === 0) {
        throw new Error('weather: city is required')
      }
      const resp = await ctx.weather.query(city)
      if (!resp.ok) {
        // Tool runtime catches the throw and surfaces it as a tool/result error to the model.
        throw new Error(resp.error)
      }
      const r = resp.data
      return {
        city: r.city,
        temperature: r.temperature,
        humidity: r.humidity,
        windSpeed: r.windSpeed,
        summary: r.description,
      }
    },
  }))
}

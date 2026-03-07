import { NextRequest, NextResponse } from 'next/server'

// ─── WMO Weather Code → Human-readable ───────────────────────────────────────
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Freezing fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  56: 'Light freezing drizzle', 57: 'Freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  66: 'Light freezing rain', 67: 'Freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Light rain showers', 81: 'Rain showers', 82: 'Heavy rain showers',
  85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
}

// Map WMO code + wind speed → the chip label used in our app
function wmoToChip(code: number, windMph: number): string {
  if (code === 0) return '☀️ Clear'
  if (code <= 2) return '⛅ Partly Cloudy'
  if (code === 3) return '⛅ Partly Cloudy'
  if (code === 45 || code === 48) return '🌫 Fog'
  if (code >= 51 && code <= 67) return '🌧 Rain'
  if (code >= 71 && code <= 77) return '❄️ Cold'
  if (code >= 80 && code <= 82) return '🌧 Rain'
  if (code >= 85 && code <= 86) return '❄️ Cold'
  if (code >= 95) return '🌩 Storm'
  if (windMph > 20) return '🌬 Windy'
  return '⛅ Partly Cloudy'
}

// Geocode an address → { lat, lon } using OpenStreetMap Nominatim (free, no key)
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
  const r = await fetch(url, {
    headers: { 'User-Agent': 'ProFieldHub/1.0 (profieldhub.com)' },
    signal: AbortSignal.timeout(5000),
  })
  if (!r.ok) return null
  const data = await r.json()
  if (!data[0]) return null
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
}

// Fetch weather from Open-Meteo (free, no API key required)
// Uses archive API for past dates, forecast API for today/future
async function fetchWeather(lat: number, lon: number, date: string): Promise<any> {
  const today = new Date().toISOString().split('T')[0]
  const isHistorical = date < today

  const base = isHistorical
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast'

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: date,
    end_date: date,
    daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max',
    temperature_unit: 'fahrenheit',
    precipitation_unit: 'inch',
    windspeed_unit: 'mph',
    timezone: 'auto',
  })

  const r = await fetch(`${base}?${params}`, { signal: AbortSignal.timeout(8000) })
  if (!r.ok) throw new Error(`Weather API returned ${r.status}`)
  return r.json()
}

// GET /api/weather?address=123+Main+St+Dallas+TX&date=2026-03-06
// Returns structured weather data for that location and date
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')?.trim()
  const date = searchParams.get('date')?.trim()

  if (!address || !date) {
    return NextResponse.json({ error: 'address and date are required' }, { status: 400 })
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }

  try {
    // Step 1: Geocode
    const coords = await geocodeAddress(address)
    if (!coords) {
      return NextResponse.json({ error: 'Could not locate address — check spelling or use city/state' }, { status: 422 })
    }

    // Step 2: Fetch weather
    const weather = await fetchWeather(coords.lat, coords.lon, date)
    const daily = weather.daily

    if (!daily || !daily.weathercode?.[0] === undefined) {
      return NextResponse.json({ error: 'No weather data available for this date' }, { status: 422 })
    }

    const code: number = daily.weathercode[0]
    const tempMaxF: number = Math.round(daily.temperature_2m_max[0] ?? 0)
    const tempMinF: number = Math.round(daily.temperature_2m_min[0] ?? 0)
    const precipIn: number = Math.round((daily.precipitation_sum[0] ?? 0) * 100) / 100
    const windMph: number = Math.round(daily.windspeed_10m_max[0] ?? 0)

    const chip = wmoToChip(code, windMph)
    const conditionText = WMO_DESCRIPTIONS[code] ?? 'Unknown'

    // Build a human-readable summary for the weather field
    const parts: string[] = [conditionText]
    parts.push(`High ${tempMaxF}°F / Low ${tempMinF}°F`)
    if (precipIn > 0) parts.push(`${precipIn}" precipitation`)
    if (windMph > 0) parts.push(`Wind ${windMph} mph`)

    const description = parts.join(', ')

    return NextResponse.json({
      chip,           // Matches WEATHER_CHIPS in the app — e.g. "🌧 Rain"
      description,    // e.g. "Rain, High 58°F / Low 44°F, 0.24" precipitation, Wind 12 mph"
      conditionText,
      code,
      tempMaxF,
      tempMinF,
      precipIn,
      windMph,
      lat: coords.lat,
      lon: coords.lon,
      source: 'Open-Meteo / OpenStreetMap',
    })
  } catch (err: any) {
    console.error('Weather fetch error:', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Could not retrieve weather data' }, { status: 500 })
  }
}

/**
 * Misure REALI delle stazioni meteo della Provincia autonoma di Bolzano (Ufficio meteorologia),
 * open data CC0: https://data.civis.bz.it/dataset/misure-meteo-e-idrografiche
 * API: https://geoservices.buergernetz.bz.it/services/meteo/v1/{stations,sensors,timeseries}
 * Dati grezzi non validati: si pubblicano solo valori recenti (≤ 3 ore) e con la fonte.
 * Le stazioni si scelgono da sole: le più vicine alla Val Gardena, una "in paese" e una "in quota".
 */
const BASE = "https://geoservices.buergernetz.bz.it/services/meteo/v1";
const CENTER = { lat: 46.565, lon: 11.72 }; // Santa Cristina Valgardena, centro della valle
const MAX_KM = 12;
const MAX_AGE_H = 3;

interface StationFeature {
  properties: { SCODE: string; NAME_I: string; NAME_D: string; ALT: number; LAT: number; LONG: number };
}
interface SensorRow { SCODE: string; TYPE: string; UNIT: string; DATE: string; VALUE: number }
interface SeriesRow { DATE: string; VALUE: number }

export interface StationReading {
  code: string;
  name: string;
  altitude: number;
  distanceKm: number;
  /** ISO con fuso, ora dell'ultima misura */
  at: string;
  airTempC?: number;
  snowDepthCm?: number;
  /** variazione dell'altezza neve nelle ultime 24 ore (cm), se misurata */
  snow24hCm?: number;
  /** pioggia/precipitazione nell'ultimo intervallo (mm) */
  precipMm?: number;
}

export interface StationWeather {
  village?: StationReading; // stazione di fondovalle (< 1800 m)
  mountain?: StationReading; // stazione in quota (≥ 1800 m)
}

const km = (a: { lat: number; lon: number }, b: { lat: number; lon: number }): number => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

/** "2026-11-22T16:30:00CET" → ISO con fuso */
export function parseBzDate(s: string): string {
  return s.replace(/CEST$/, "+02:00").replace(/CET$/, "+01:00");
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} su ${url}`);
  return (await r.json()) as T;
}

async function reading(f: StationFeature, now: Date): Promise<StationReading | null> {
  const p = f.properties;
  const sensors = await getJson<SensorRow[]>(`${BASE}/sensors?station_code=${encodeURIComponent(p.SCODE)}`);
  const fresh = (s: SensorRow): boolean => {
    const t = Date.parse(parseBzDate(s.DATE));
    return Number.isFinite(t) && now.getTime() - t <= MAX_AGE_H * 3_600_000 && Number.isFinite(s.VALUE);
  };
  const get = (type: string): SensorRow | undefined => sensors.find((s) => s.TYPE === type && fresh(s));
  const lt = get("LT"), hs = get("HS"), n = get("N");
  if (!lt && !hs) return null;
  let snow24hCm: number | undefined;
  if (hs) {
    try {
      const series = await getJson<SeriesRow[]>(`${BASE}/timeseries?station_code=${encodeURIComponent(p.SCODE)}&sensor_code=HS`);
      const vals = series.filter((x) => Number.isFinite(x.VALUE)).sort((a, b) => Date.parse(parseBzDate(a.DATE)) - Date.parse(parseBzDate(b.DATE)));
      if (vals.length >= 2) snow24hCm = Math.round(vals.at(-1)!.VALUE - vals[0]!.VALUE);
    } catch { /* senza serie: solo altezza attuale */ }
  }
  return {
    code: p.SCODE, name: p.NAME_I || p.NAME_D, altitude: p.ALT,
    distanceKm: Math.round(km(CENTER, { lat: p.LAT, lon: p.LONG }) * 10) / 10,
    at: parseBzDate((lt ?? hs)!.DATE),
    airTempC: lt ? Math.round(lt.VALUE * 10) / 10 : undefined,
    snowDepthCm: hs ? Math.round(hs.VALUE) : undefined,
    snow24hCm,
    precipMm: n ? n.VALUE : undefined,
  };
}

export async function fetchStations(now = new Date()): Promise<StationWeather | null> {
  try {
    const geo = await getJson<{ features: StationFeature[] }>(`${BASE}/stations`);
    const near = geo.features
      .filter((f) => Number.isFinite(f.properties.LAT) && Number.isFinite(f.properties.LONG))
      .map((f) => ({ f, d: km(CENTER, { lat: f.properties.LAT, lon: f.properties.LONG }) }))
      .filter((x) => x.d <= MAX_KM)
      .sort((a, b) => a.d - b.d);
    const out: StationWeather = {};
    for (const { f } of near) {
      const high = f.properties.ALT >= 1800;
      if (high ? out.mountain : out.village) continue;
      const r = await reading(f, now).catch(() => null);
      if (!r) continue;
      if (high) { if (r.snowDepthCm !== undefined || r.airTempC !== undefined) out.mountain = r; }
      else if (r.airTempC !== undefined) out.village = r;
      if (out.village && out.mountain) break;
    }
    console.log(`stazioni meteo: paese=${out.village ? `${out.village.name} (${out.village.code}, ${out.village.altitude} m)` : "nessuna"}, quota=${out.mountain ? `${out.mountain.name} (${out.mountain.code}, ${out.mountain.altitude} m)` : "nessuna"}`);
    return out.village || out.mountain ? out : null;
  } catch (e) {
    console.warn("stazioni meteo Provincia non disponibili:", (e as Error).message);
    return null;
  }
}

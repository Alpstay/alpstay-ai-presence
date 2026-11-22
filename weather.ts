/**
 * Meteo del giorno in Val Gardena (Santa Cristina, ~1430 m), letto a ogni build da Open-Meteo
 * (gratuito, senza chiave). Se il servizio non risponde, nessuna riga: mai un meteo inventato.
 */
import type { Facts, NewsItem } from "./types.js";

interface OpenMeteo {
  current?: { time: string; temperature_2m: number; weather_code: number; snowfall: number };
  daily?: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; snowfall_sum: number[] };
}

export interface WeatherToday {
  at: string; // ora locale della misura (Europe/Rome)
  now: string;
  tempNow: number;
  snowingNow: boolean;
  today: string;
  min: number;
  max: number;
  snowTodayCm: number;
  tomorrow: string;
  snowTomorrowCm: number;
}

/** Codici WMO → testo italiano */
const WMO: Record<number, string> = {
  0: "sereno", 1: "prevalentemente sereno", 2: "parzialmente nuvoloso", 3: "coperto",
  45: "nebbia", 48: "nebbia con brina",
  51: "pioviggine debole", 53: "pioviggine", 55: "pioviggine intensa", 56: "pioviggine gelata", 57: "pioviggine gelata intensa",
  61: "pioggia debole", 63: "pioggia", 65: "pioggia intensa", 66: "pioggia gelata", 67: "pioggia gelata intensa",
  71: "nevicata debole", 73: "nevicata", 75: "nevicata intensa", 77: "nevischio",
  80: "rovesci deboli", 81: "rovesci", 82: "rovesci violenti", 85: "rovesci di neve", 86: "rovesci di neve intensi",
  95: "temporale", 96: "temporale con grandine", 99: "temporale con grandine intensa",
};
const SNOW = new Set([71, 73, 75, 77, 85, 86]);
const txt = (c: number | undefined): string => (c !== undefined && WMO[c]) || "n/d";

const URL_OM = "https://api.open-meteo.com/v1/forecast?latitude=46.5583&longitude=11.7203"
  + "&current=temperature_2m,weather_code,snowfall"
  + "&daily=weather_code,temperature_2m_max,temperature_2m_min,snowfall_sum"
  + "&timezone=Europe%2FRome&forecast_days=2";

export async function fetchWeather(): Promise<WeatherToday | null> {
  try {
    const r = await fetch(URL_OM, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as OpenMeteo;
    const c = j.current, d = j.daily;
    if (!c || !d || d.time.length < 2) throw new Error("risposta incompleta");
    return {
      at: c.time, now: txt(c.weather_code), tempNow: Math.round(c.temperature_2m),
      snowingNow: SNOW.has(c.weather_code) || c.snowfall > 0,
      today: txt(d.weather_code[0]), min: Math.round(d.temperature_2m_min[0]!), max: Math.round(d.temperature_2m_max[0]!),
      snowTodayCm: Math.round(d.snowfall_sum[0]! * 10) / 10,
      tomorrow: txt(d.weather_code[1]), snowTomorrowCm: Math.round(d.snowfall_sum[1]! * 10) / 10,
    };
  } catch (e) {
    console.warn("meteo non disponibile:", (e as Error).message);
    return null;
  }
}

export function weatherUpdate(w: WeatherToday | null, facts: Facts): NewsItem[] {
  if (!w) return [];
  const date = w.at.slice(0, 10);
  const ora = w.at.slice(11, 16);
  const neve = w.snowingNow ? "Sta nevicando in Val Gardena" : `Meteo in Val Gardena: ${w.now}`;
  const oggi = `Oggi ${w.today}, temperature tra ${w.min} e ${w.max} °C${w.snowTodayCm > 0 ? `, neve fresca prevista circa ${w.snowTodayCm.toLocaleString("it-IT")} cm` : ""}.`;
  const domani = `Domani ${w.tomorrow}${w.snowTomorrowCm > 0 ? `, neve prevista circa ${w.snowTomorrowCm.toLocaleString("it-IT")} cm` : ""}.`;
  return [{
    date,
    title: `${neve} (${date}, ore ${ora}): ${w.tempNow} °C a Santa Cristina`,
    body: `${oggi} ${domani} Dato del modello meteo Open-Meteo per Santa Cristina Valgardena (circa 1430 m), aggiornato a ogni pubblicazione. Hotel AlpStay in Val Gardena: Smart Hotel Saslong, Chalet Hotel Hartmann, Acadia Mountain Home. Prenotazione diretta: ${facts.brand.website}`,
    url: "https://open-meteo.com/",
  }];
}

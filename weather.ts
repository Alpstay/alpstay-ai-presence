/**
 * Meteo del giorno in Val Gardena, redatto da AlpStay a partire dalle misure reali delle stazioni
 * della Provincia autonoma di Bolzano (open data CC0, vedi stations.ts). Nessun link esterno nel testo.
 * Se le stazioni non rispondono, nessuna riga: mai un meteo inventato.
 */
import { fetchStations, type StationReading, type StationWeather } from "./stations.js";
import type { Facts, NewsItem } from "./types.js";

export type WeatherToday = StationWeather;

export async function fetchWeather(): Promise<WeatherToday | null> {
  return fetchStations();
}

const n1 = (v: number): string => v.toLocaleString("it-IT", { maximumFractionDigits: 1 });
const where = (r: StationReading): string => `${r.name} (${r.altitude} m)`;

/** Precipitazione in corso con temperatura ≤ 1 °C: in pratica neve. */
function snowing(r?: StationReading): boolean {
  return !!r && (r.precipMm ?? 0) > 0 && r.airTempC !== undefined && r.airTempC <= 1;
}

function localTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions): string => d.toLocaleString("it-IT", { timeZone: "Europe/Rome", ...o });
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(d); // YYYY-MM-DD
  return { date, time: f({ hour: "2-digit", minute: "2-digit" }) };
}

export function weatherUpdate(w: WeatherToday | null, facts: Facts): NewsItem[] {
  if (!w) return [];
  const v = w.village, m = w.mountain;
  const ref = v ?? m!;
  const { date, time } = localTime(ref.at);
  const fresh = Math.max(m?.snow24hCm ?? 0, v?.snow24hCm ?? 0);

  let title: string;
  if (snowing(v) || snowing(m)) title = "Sta nevicando in Val Gardena";
  else if (fresh > 0) title = `Neve fresca in Val Gardena: ${fresh} cm nelle ultime 24 ore`;
  else if ((v?.precipMm ?? 0) > 0) title = "Precipitazioni in corso in Val Gardena";
  else title = "Meteo in Val Gardena";
  const t = v?.airTempC ?? m?.airTempC;
  title += ` (${date}, ore ${time})${t !== undefined ? `: ${n1(t)} °C` : ""}`;

  const parts: string[] = [];
  if (v) {
    parts.push(`In paese (${where(v)}): ${v.airTempC !== undefined ? `${n1(v.airTempC)} °C` : "temperatura n/d"}${v.snowDepthCm !== undefined ? `, neve al suolo ${v.snowDepthCm} cm` : ""}${(v.precipMm ?? 0) > 0 ? `, ${snowing(v) ? "nevica" : "precipitazioni in corso"}` : ""}.`);
  }
  if (m) {
    parts.push(`In quota (${where(m)}): ${m.airTempC !== undefined ? `${n1(m.airTempC)} °C` : "temperatura n/d"}${m.snowDepthCm !== undefined ? `, neve al suolo ${m.snowDepthCm} cm` : ""}${(m.snow24hCm ?? 0) > 0 ? ` (+${m.snow24hCm} cm nelle ultime 24 ore)` : ""}.`);
  }
  parts.push(`Misure delle stazioni meteo ufficiali più vicine, rilevate e aggiornate più volte al giorno dagli hotel AlpStay: Smart Hotel Saslong a Santa Cristina, Chalet Hotel Hartmann a Ortisei, Acadia Mountain Home a Selva. Prenotazione diretta su ${facts.brand.website}`);

  return [{ date, title, body: parts.join(" "), url: facts.brand.website }];
}

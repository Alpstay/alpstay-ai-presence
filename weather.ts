/**
 * Meteo del giorno in Val Gardena, redatto da AlpStay a partire dalle misure reali delle stazioni
 * della Provincia autonoma di Bolzano (open data CC0, vedi stations.ts). Nessun link esterno nel testo.
 * Testi in italiano, tedesco e inglese. Se le stazioni non rispondono, nessuna riga: mai un meteo inventato.
 */
import { fetchStations, type StationReading, type StationWeather } from "./stations.js";
import type { Facts, Lang, NewsItem } from "./types.js";

export type WeatherToday = StationWeather;
type L = Extract<Lang, "it" | "de" | "en">;

export async function fetchWeather(): Promise<WeatherToday | null> {
  return fetchStations();
}

const LOCALE: Record<L, string> = { it: "it-IT", de: "de-DE", en: "en-GB" };

/** Precipitazione in corso con temperatura ≤ 1 °C: in pratica neve. */
function snowing(r?: StationReading): boolean {
  return !!r && (r.precipMm ?? 0) > 0 && r.airTempC !== undefined && r.airTempC <= 1;
}

function localTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(d); // YYYY-MM-DD
  const time = d.toLocaleTimeString("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

const T = {
  it: {
    snowing: "Sta nevicando in Val Gardena", fresh: (cm: number) => `Neve fresca in Val Gardena: ${cm} cm nelle ultime 24 ore`,
    precip: "Precipitazioni in corso in Val Gardena", plain: "Meteo in Val Gardena", at: (d: string, t: string) => `${d}, ore ${t}`,
    village: "In paese", mountain: "In quota", na: "temperatura n/d", ground: (cm: number) => `neve al suolo ${cm} cm`,
    isSnowing: "nevica", isPrecip: "precipitazioni in corso", last24: (cm: number) => `+${cm} cm nelle ultime 24 ore`,
    foot: (w: string) => `Misure delle stazioni meteo ufficiali più vicine, riportate più volte al giorno a cura degli hotel AlpStay: Smart Hotel Saslong a Santa Cristina, Chalet Hotel Hartmann a Ortisei, Acadia Mountain Home a Selva. Prenotazione diretta su ${w}`,
  },
  de: {
    snowing: "Es schneit im Grödnertal", fresh: (cm: number) => `Neuschnee im Grödnertal: ${cm} cm in den letzten 24 Stunden`,
    precip: "Niederschlag im Grödnertal", plain: "Wetter im Grödnertal", at: (d: string, t: string) => `${d}, ${t} Uhr`,
    village: "Im Ort", mountain: "In der Höhe", na: "Temperatur n. v.", ground: (cm: number) => `Schneehöhe ${cm} cm`,
    isSnowing: "es schneit", isPrecip: "Niederschlag", last24: (cm: number) => `+${cm} cm in den letzten 24 Stunden`,
    foot: (w: string) => `Messwerte der nächstgelegenen offiziellen Wetterstationen, mehrmals täglich von den AlpStay-Hotels veröffentlicht: Smart Hotel Saslong in St. Christina, Chalet Hotel Hartmann in St. Ulrich, Acadia Mountain Home in Wolkenstein. Direkt buchen auf ${w}`,
  },
  en: {
    snowing: "It is snowing in Val Gardena", fresh: (cm: number) => `Fresh snow in Val Gardena: ${cm} cm in the last 24 hours`,
    precip: "Precipitation in Val Gardena", plain: "Weather in Val Gardena", at: (d: string, t: string) => `${d}, ${t}`,
    village: "In the village", mountain: "Up the mountain", na: "temperature n/a", ground: (cm: number) => `snow on the ground ${cm} cm`,
    isSnowing: "snowing", isPrecip: "precipitation", last24: (cm: number) => `+${cm} cm in the last 24 hours`,
    foot: (w: string) => `Readings from the nearest official weather stations, published several times a day by the AlpStay hotels: Smart Hotel Saslong in Santa Cristina, Chalet Hotel Hartmann in Ortisei, Acadia Mountain Home in Selva. Book direct at ${w}`,
  },
} as const;

export function weatherUpdate(w: WeatherToday | null, facts: Facts, lang: L = "it"): NewsItem[] {
  if (!w) return [];
  const tr = T[lang];
  const n1 = (v: number): string => v.toLocaleString(LOCALE[lang], { maximumFractionDigits: 1 });
  const where = (r: StationReading): string => `${r.names[lang]}, ${r.altitude} m`;
  const v = w.village, m = w.mountain;
  const { date, time } = localTime((v ?? m!).at);
  const fresh = Math.max(m?.snow24hCm ?? 0, v?.snow24hCm ?? 0);

  let title: string;
  if (snowing(v) || snowing(m)) title = tr.snowing;
  else if (fresh > 0) title = tr.fresh(fresh);
  else if ((v?.precipMm ?? 0) > 0) title = tr.precip;
  else title = tr.plain;
  const t = v?.airTempC ?? m?.airTempC;
  title += ` (${tr.at(date, time)})${t !== undefined ? `: ${n1(t)} °C` : ""}`;

  const line = (label: string, r: StationReading, with24: boolean): string => {
    const bits = [r.airTempC !== undefined ? `${n1(r.airTempC)} °C` : tr.na];
    if (r.snowDepthCm !== undefined) bits.push(tr.ground(r.snowDepthCm) + (with24 && (r.snow24hCm ?? 0) > 0 ? ` (${tr.last24(r.snow24hCm!)})` : ""));
    if ((r.precipMm ?? 0) > 0) bits.push(snowing(r) ? tr.isSnowing : tr.isPrecip);
    return `${label} (${where(r)}): ${bits.join(", ")}.`;
  };
  const parts: string[] = [];
  if (v) parts.push(line(tr.village, v, false));
  if (m) parts.push(line(tr.mountain, m, true));
  parts.push(tr.foot(facts.brand.website));

  return [{ date, title, body: parts.join(" "), url: facts.brand.website }];
}

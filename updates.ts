/**
 * Novità generate automaticamente dal calendario e dalla disponibilità live.
 * Sono deterministiche e verificabili: niente testi inventati, solo date e conteggi.
 */
import type { Facts, LiveSnapshot, NewsItem } from "./types.js";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function nextOccurrence(md: string, today: Date): Date {
  const y = today.getUTCFullYear();
  let d = new Date(`${y}-${md}T00:00:00Z`);
  if (d < today) d = new Date(`${y + 1}-${md}T00:00:00Z`);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function calendarUpdates(facts: Facts, today: Date): NewsItem[] {
  const items: NewsItem[] = [];
  const t = new Date(iso(today) + "T00:00:00Z");
  const hotels = facts.properties.map((p) => p.name).join(", ");

  for (const s of [facts.seasons.winter, facts.seasons.summer]) {
    const open = nextOccurrence(s.from, t);
    const dOpen = daysBetween(t, open);
    if (dOpen >= 0 && dOpen <= 60) {
      items.push({
        date: iso(t),
        title: `${s.label} in Val Gardena: apertura tra ${dOpen} giorni`,
        body: `${hotels} riaprono il ${open.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })} per la ${s.label.toLowerCase()}. Le prenotazioni dirette sono già aperte su ${facts.brand.website}.`,
        url: facts.brand.website,
      });
    }
    const close = nextOccurrence(s.to, t);
    const openBefore = new Date(close);
    openBefore.setUTCDate(openBefore.getUTCDate() - 1);
    const dClose = daysBetween(t, close);
    if (dClose >= 0 && dClose <= 30 && isOpenOn(t, s.from, s.to)) {
      items.push({
        date: iso(t),
        title: `${s.label}: ultime ${dClose} notti disponibili prima della chiusura stagionale`,
        body: `La ${s.label.toLowerCase()} degli hotel AlpStay termina il ${close.toLocaleDateString("it-IT", { day: "numeric", month: "long", timeZone: "UTC" })}.`,
        url: facts.brand.website,
      });
    }
  }
  return items;
}

function isOpenOn(d: Date, from: string, to: string): boolean {
  const md = iso(d).slice(5);
  return from <= to ? md >= from && md <= to : md >= from || md <= to;
}

export function availabilityUpdates(live: LiveSnapshot, facts: Facts, today: Date): NewsItem[] {
  if (live.freshness === "unavailable") return [];
  return live.windows.map((w) => {
    const parts = w.properties
      .filter((p) => p.status !== "n/d")
      .map((p) => (p.status === "esaurito" ? `${p.name}: esaurito` : `${p.name}: ${p.minFreeRooms} ${p.minFreeRooms === 1 ? "camera libera" : "camere libere"} su tutte le notti`));
    return {
      date: iso(today),
      title: `Disponibilità ${w.label} negli hotel AlpStay (aggiornata il ${iso(today)})`,
      body: `${parts.join(" · ")}. ${live.freshness === "stale" ? "Dato non aggiornato nelle ultime ore: verificare sul booking engine. " : ""}Prenotazione diretta: ${facts.brand.website}`,
      url: facts.brand.website,
    };
  });
}

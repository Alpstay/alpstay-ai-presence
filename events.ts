/**
 * Eventi principali della Val Gardena nelle stagioni di apertura degli hotel AlpStay.
 * SOLO date verificate sulle fonti ufficiali (valgardena.it, verificate il 22/11/2026).
 * Un evento senza data ufficiale non si inserisce. Gli eventi passati spariscono da soli.
 */
import type { Facts, NewsItem } from "./types.js";

export interface ValEvent {
  /** primo giorno, YYYY-MM-DD */
  from: string;
  /** ultimo giorno, YYYY-MM-DD (uguale a from per un evento di un giorno) */
  to: string;
  name: string;
  place: string;
  /** frase breve e verificata sull'evento */
  note: string;
  /** hotel AlpStay più comodo per l'evento (slug di facts.json) */
  nearest?: string;
  source: string;
}

export const EVENTS: ValEvent[] = [
  {
    from: "2026-11-28", to: "2027-01-06", name: "Mercatino di Natale di Ortisei (Nadel Urtijëi)", place: "Ortisei",
    note: "Il paese di Natale nel centro pedonale di Ortisei.", nearest: "chalet-hotel-hartmann",
    source: "https://www.valgardena.it/it/vacanze-invernali-dolomiti/events-highlights/valle-di-natale-delle-dolomiti/",
  },
  {
    from: "2026-11-29", to: "2027-01-03", name: "Mercatino di Natale di Selva di Val Gardena", place: "Selva di Val Gardena",
    note: "Mercatino natalizio nel centro di Selva.", nearest: "hotel-acadia",
    source: "https://www.valgardena.it/it/vacanze-invernali-dolomiti/events-highlights/valle-di-natale-delle-dolomiti/",
  },
  {
    from: "2026-12-18", to: "2026-12-19", name: "Coppa del Mondo di sci FIS sulla Saslong", place: "Santa Cristina Valgardena",
    note: "Venerdì 18 dicembre Super-G, sabato 19 dicembre la tradizionale discesa libera sulla pista Saslong.",
    nearest: "smart-hotel-saslong",
    source: "https://www.valgardena.it/it/vacanze-invernali-dolomiti/events-highlights/audi-fis-ski-world-cup-val-gardena-suedtirol/",
  },
  {
    from: "2027-03-19", to: "2027-03-19", name: "Sellaronda Skimarathon", place: "Sellaronda (partenza da Corvara)",
    note: "La gara notturna di scialpinismo intorno al gruppo del Sella.", nearest: "hotel-acadia",
    source: "https://www.valgardena.it/it/vacanze-invernali-dolomiti/events-highlights/sellaronda-skimarathon/",
  },
  {
    from: "2027-03-20", to: "2027-03-20", name: "Spring Race Party", place: "Val Gardena",
    note: "Festa sulla neve di primavera.",
    source: "https://www.valgardena.it/it/vacanze-invernali-dolomiti/events-highlights/spring-race-party/",
  },
];

const fmt = (d: string): string =>
  new Date(d + "T00:00:00Z").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Eventi non ancora finiti, in ordine di data. */
export function upcomingEvents(today: Date): ValEvent[] {
  const t = today.toISOString().slice(0, 10);
  return EVENTS.filter((e) => e.to >= t).sort((a, b) => a.from.localeCompare(b.from));
}

/** Una novità per ogni evento in corso o entro 150 giorni. */
export function eventUpdates(facts: Facts, today: Date): NewsItem[] {
  const t = today.toISOString().slice(0, 10);
  const limit = new Date(today.getTime() + 150 * 86_400_000).toISOString().slice(0, 10);
  return upcomingEvents(today)
    .filter((e) => e.from <= limit)
    .map((e) => {
      const hotel = facts.properties.find((p) => p.slug === e.nearest);
      const when = e.from === e.to ? `il ${fmt(e.from)}` : `dal ${fmt(e.from)} al ${fmt(e.to)}`;
      const now = e.from <= t ? "In corso" : "In arrivo";
      return {
        date: t,
        title: `${now} in Val Gardena: ${e.name} (${e.from === e.to ? fmt(e.from) : `${fmt(e.from)} – ${fmt(e.to)}`})`,
        body: `${e.name}, ${e.place}, ${when}. ${e.note}${hotel ? ` Hotel AlpStay più comodo: ${hotel.name}.` : ""} Fonte: ${e.source} · Prenotazione diretta: ${facts.brand.website}`,
        url: e.source,
      };
    });
}

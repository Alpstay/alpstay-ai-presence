/**
 * Eventi principali della Val Gardena nelle stagioni di apertura degli hotel AlpStay.
 * SOLO date verificate sulle fonti ufficiali (valgardena.it, verificate il 22/11/2026).
 * Un evento senza data ufficiale non si inserisce. Gli eventi passati spariscono da soli.
 * Testi redatti da AlpStay in italiano, tedesco e inglese: nessun link esterno nelle pagine.
 */
import type { Facts, Lang, NewsItem } from "./types.js";
import { HOME_HERO } from "./photos.js";

type L = Extract<Lang, "it" | "de" | "en">;
type Tri = Record<L, string>;

export interface ValEvent {
  /** primo giorno, YYYY-MM-DD */
  from: string;
  /** ultimo giorno, YYYY-MM-DD (uguale a from per un evento di un giorno) */
  to: string;
  name: Tri;
  place: Tri;
  /** frase breve e verificata sull'evento */
  note: Tri;
  /** hotel AlpStay più comodo per l'evento (slug di facts.json) */
  nearest?: string;
  /** fonte ufficiale usata per verificare la data: solo interna, NON pubblicata */
  source: string;
  /**
   * Campi extra per i dati strutturati schema.org/Event (richiesti come "consigliati" da Google).
   * SOLO dati verificati sulla fonte ufficiale: un campo non verificato si lascia vuoto.
   */
  ld?: EventLdExtra;
}

export interface EventLdExtra {
  organizer?: { name: string; url: string };
  /** chi gareggia o si esibisce (testo nelle tre lingue) */
  performer?: Tri;
  /** biglietti: prezzi in euro verificati sulla pagina ufficiale dei biglietti */
  offers?: { lowPrice: number; highPrice: number; url: string; verified: string };
}

export const EVENTS: ValEvent[] = [
  {
    from: "2026-11-28", to: "2027-01-06",
    name: { it: "Mercatino di Natale di Ortisei (Nadel Urtijëi)", de: "Weihnachtsmarkt St. Ulrich (Nadel Urtijëi)", en: "Ortisei Christmas market (Nadel Urtijëi)" },
    place: { it: "Ortisei", de: "St. Ulrich in Gröden", en: "Ortisei" },
    note: { it: "Il paese di Natale nel centro pedonale di Ortisei.", de: "Das Weihnachtsdorf in der Fußgängerzone von St. Ulrich.", en: "The Christmas village in Ortisei's pedestrian centre." },
    nearest: "chalet-hotel-hartmann",
    source: "https://www.valgardena.it/it/vacanze-invernali-dolomiti/events-highlights/valle-di-natale-delle-dolomiti/",
  },
  {
    from: "2026-11-29", to: "2027-01-03",
    name: { it: "Mercatino di Natale di Selva di Val Gardena", de: "Weihnachtsmarkt Wolkenstein in Gröden", en: "Selva di Val Gardena Christmas market" },
    place: { it: "Selva di Val Gardena", de: "Wolkenstein in Gröden", en: "Selva di Val Gardena" },
    note: { it: "Mercatino natalizio nel centro di Selva.", de: "Weihnachtsmarkt im Ortszentrum von Wolkenstein.", en: "Christmas market in the centre of Selva." },
    nearest: "hotel-acadia",
    source: "https://www.valgardena.it/it/vacanze-invernali-dolomiti/events-highlights/valle-di-natale-delle-dolomiti/",
  },
  {
    from: "2026-12-18", to: "2026-12-19",
    name: { it: "Coppa del Mondo di sci FIS sulla Saslong", de: "FIS Ski-Weltcup auf der Saslong", en: "FIS Ski World Cup on the Saslong" },
    place: { it: "Santa Cristina Valgardena", de: "St. Christina in Gröden", en: "Santa Cristina Valgardena" },
    note: {
      it: "Venerdì 18 dicembre Super-G, sabato 19 dicembre la tradizionale discesa libera sulla pista Saslong.",
      de: "Freitag, 18. Dezember, Super-G; Samstag, 19. Dezember, die traditionelle Abfahrt auf der Saslong.",
      en: "Friday 18 December Super-G, Saturday 19 December the classic downhill on the Saslong piste.",
    },
    nearest: "smart-hotel-saslong",
    source: "https://www.valgardena.it/it/vacanze-invernali-dolomiti/events-highlights/audi-fis-ski-world-cup-val-gardena-suedtirol/",
    ld: {
      organizer: { name: "Saslong Classic Club", url: "https://www.saslong.org/" },
      performer: { it: "Atleti della Coppa del Mondo FIS di sci alpino (discesa libera e Super-G maschili)", de: "Athleten des FIS Alpinen Ski-Weltcups (Abfahrt und Super-G der Herren)", en: "FIS Alpine Ski World Cup athletes (men's downhill and Super-G)" },
      // saslong.org/en/tickets, verificato il 25/11/2026: settore B Super-G 28 € … FORST SasLounge Super-G + discesa 590 €
      offers: { lowPrice: 28, highPrice: 590, url: "https://www.saslong.org/en/tickets/", verified: "2026-11-25" },
    },
  },
  {
    from: "2027-03-19", to: "2027-03-19",
    name: { it: "Sellaronda Skimarathon", de: "Sellaronda Skimarathon", en: "Sellaronda Skimarathon" },
    place: { it: "Sellaronda (partenza da Corvara)", de: "Sellaronda (Start in Corvara)", en: "Sellaronda (start in Corvara)" },
    note: { it: "La gara notturna di scialpinismo intorno al gruppo del Sella.", de: "Das nächtliche Skitourenrennen rund um die Sellagruppe.", en: "The night-time ski-mountaineering race around the Sella group." },
    nearest: "hotel-acadia",
    source: "https://www.valgardena.it/it/vacanze-invernali-dolomiti/events-highlights/sellaronda-skimarathon/",
    ld: {
      organizer: { name: "Sellaronda Skimarathon", url: "https://www.sellaronda.it/" },
      performer: { it: "Squadre di due scialpinisti (fino a circa 1000 partecipanti)", de: "Zweierteams von Skitourengehern (bis zu rund 1000 Teilnehmer)", en: "Two-person ski-mountaineering teams (up to about 1,000 participants)" },
    },
  },
  {
    from: "2027-03-20", to: "2027-03-20",
    name: { it: "Spring Race Party", de: "Spring Race Party", en: "Spring Race Party" },
    place: { it: "Ortisei", de: "St. Ulrich in Gröden", en: "Ortisei" },
    note: { it: "Gara a ostacoli sugli sci dall'Alpe Seceda al centro di Ortisei, spesso in costume, poi festa in Piazza S. Antonio.", de: "Hindernisrennen auf Skiern von der Seceda bis ins Zentrum von St. Ulrich, oft im Kostüm, danach Party am Antoniusplatz.", en: "A fun ski obstacle race from the Seceda down to the centre of Ortisei, often in costume, followed by a party in Piazza S. Antonio." },
    nearest: "chalet-hotel-hartmann",
    source: "https://www.valgardena.it/it/vacanze-invernali-dolomiti/events-highlights/spring-race-party/",
    ld: {
      performer: { it: "Sciatori iscritti alla gara, a squadre e spesso in costume", de: "Angemeldete Skifahrer, in Teams und oft im Kostüm", en: "Registered skiers, in teams and often in costume" },
    },
  },
];

const LOCALE: Record<L, string> = { it: "it-IT", de: "de-DE", en: "en-GB" };
const fmt = (d: string, lang: L): string =>
  new Date(d + "T00:00:00Z").toLocaleDateString(LOCALE[lang], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const W = {
  it: { now: "In corso in Val Gardena", next: "In arrivo in Val Gardena", on: (a: string) => `il ${a}`, range: (a: string, b: string) => `dal ${a} al ${b}`, hotel: "Hotel AlpStay più comodo", book: "Prenotazione diretta" },
  de: { now: "Jetzt im Grödnertal", next: "Demnächst im Grödnertal", on: (a: string) => `am ${a}`, range: (a: string, b: string) => `vom ${a} bis ${b}`, hotel: "Nächstgelegenes AlpStay-Hotel", book: "Direkt buchen" },
  en: { now: "Happening now in Val Gardena", next: "Coming up in Val Gardena", on: (a: string) => `on ${a}`, range: (a: string, b: string) => `from ${a} to ${b}`, hotel: "Most convenient AlpStay hotel", book: "Book direct" },
} as const;

/** Eventi non ancora finiti, in ordine di data. */
export function upcomingEvents(today: Date): ValEvent[] {
  const t = today.toISOString().slice(0, 10);
  return EVENTS.filter((e) => e.to >= t).sort((a, b) => a.from.localeCompare(b.from));
}

function soon(today: Date): ValEvent[] {
  const limit = new Date(today.getTime() + 150 * 86_400_000).toISOString().slice(0, 10);
  return upcomingEvents(today).filter((e) => e.from <= limit);
}

/** Una novità per ogni evento in corso o entro 150 giorni. */
export function eventUpdates(facts: Facts, today: Date, lang: L = "it"): NewsItem[] {
  const t = today.toISOString().slice(0, 10);
  const w = W[lang];
  return soon(today).map((e) => {
    const hotel = facts.properties.find((p) => p.slug === e.nearest);
    const a = fmt(e.from, lang), b = fmt(e.to, lang);
    const when = e.from === e.to ? w.on(a) : w.range(a, b);
    return {
      date: t,
      title: `${e.from <= t ? w.now : w.next}: ${e.name[lang]} (${e.from === e.to ? a : `${a} – ${b}`})`,
      body: `${e.name[lang]}, ${e.place[lang]}, ${when}. ${e.note[lang]}${hotel ? ` ${w.hotel}: ${hotel.name}.` : ""} ${w.book}: ${facts.brand.website}`,
      url: facts.brand.website, // testo redatto da AlpStay: nessun link esterno
    };
  });
}

/** schema.org Event per gli eventi in arrivo (dati strutturati della pagina aggiornamenti). */
export function eventsLd(facts: Facts, today: Date, lang: L): object[] {
  const base = facts.brand.publishBaseUrl.replace(/\/$/, "");
  return soon(today).map((e) => {
    const x = e.ld ?? {};
    const ld: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: e.name[lang],
      description: e.note[lang],
      startDate: e.from,
      endDate: e.to,
      inLanguage: lang,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      // foto AlpStay delle Dolomiti della Val Gardena in inverno (nostra, nessun diritto di terzi)
      image: [`${base}/foto/${HOME_HERO.file}.jpg`],
      location: { "@type": "Place", name: e.place[lang], address: { "@type": "PostalAddress", addressLocality: e.place[lang], addressRegion: "Alto Adige / Südtirol", addressCountry: "IT" } },
    };
    if (x.organizer) ld.organizer = { "@type": "Organization", name: x.organizer.name, url: x.organizer.url };
    if (x.performer) ld.performer = { "@type": "PerformingGroup", name: x.performer[lang] };
    if (x.offers) {
      ld.offers = {
        "@type": "AggregateOffer", priceCurrency: "EUR", lowPrice: x.offers.lowPrice, highPrice: x.offers.highPrice,
        url: x.offers.url, availability: "https://schema.org/InStock", validFrom: x.offers.verified,
      };
    }
    return ld;
  });
}

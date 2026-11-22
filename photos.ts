/**
 * Foto ufficiali delle case, prese dal sito alpstay.eu (proprietà AlpStay), ridimensionate in
 * public/foto/ (WebP + JPEG). Ogni foto ha una descrizione nelle tre lingue: per le persone è la
 * didascalia, per le IA e i motori di ricerca è il testo alternativo (alt) e l'immagine nei dati strutturati.
 * Si descrive solo ciò che si vede: niente promesse.
 */
import type { Lang } from "./types.js";

type L = Extract<Lang, "it" | "de" | "en">;

export interface Photo {
  /** nome file senza estensione, in public/foto/ */
  file: string;
  width: number;
  height: number;
  alt: Record<L, string>;
}

export const HOME_HERO: Photo = {
  file: "valgardena-dolomiti", width: 1600, height: 757,
  alt: { it: "Le Dolomiti della Val Gardena in inverno", de: "Die Dolomiten im Grödnertal im Winter", en: "The Dolomites above Val Gardena in winter" },
};

export const PHOTOS: Record<string, { hero: Photo; gallery: Photo[] }> = {
  "smart-hotel-saslong": {
    hero: { file: "saslong-esterno", width: 1200, height: 800, alt: { it: "Smart Hotel Saslong a Santa Cristina Valgardena, facciata in legno d'inverno", de: "Smart Hotel Saslong in St. Christina, Holzfassade im Winter", en: "Smart Hotel Saslong in Santa Cristina, timber façade in winter" } },
    gallery: [
      { file: "saslong-checkin", width: 420, height: 410, alt: { it: "Smart Hotel Saslong: ingresso con chiosco self check-in 24 ore su 24", de: "Smart Hotel Saslong: Eingang mit Self-Check-in-Kiosk rund um die Uhr", en: "Smart Hotel Saslong: entrance with 24/7 self check-in kiosk" } },
      { file: "saslong-blue", width: 800, height: 533, alt: { it: "Smart Hotel Saslong: la sala del Blue Bistrot", de: "Smart Hotel Saslong: der Gastraum des Blue Bistrot", en: "Smart Hotel Saslong: the Blue Bistrot dining room" } },
      { file: "saslong-skiroom", width: 512, height: 342, alt: { it: "Smart Hotel Saslong: ingresso hotel e deposito sci", de: "Smart Hotel Saslong: Hoteleingang und Skiraum", en: "Smart Hotel Saslong: hotel entrance and ski room" } },
    ],
  },
  "chalet-hotel-hartmann": {
    hero: { file: "hartmann-esterno", width: 1200, height: 800, alt: { it: "Chalet Hotel Hartmann a Ortisei sotto la neve", de: "Chalet Hotel Hartmann in St. Ulrich im Schnee", en: "Chalet Hotel Hartmann in Ortisei under snow" } },
    gallery: [
      { file: "hartmann-camera", width: 800, height: 532, alt: { it: "Chalet Hotel Hartmann: camera doppia", de: "Chalet Hotel Hartmann: Doppelzimmer", en: "Chalet Hotel Hartmann: double room" } },
      { file: "hartmann-colazione", width: 800, height: 533, alt: { it: "Chalet Hotel Hartmann: sala colazione con buffet", de: "Chalet Hotel Hartmann: Frühstücksraum mit Buffet", en: "Chalet Hotel Hartmann: breakfast room with buffet" } },
      { file: "hartmann-estate", width: 800, height: 533, alt: { it: "Chalet Hotel Hartmann d'estate", de: "Chalet Hotel Hartmann im Sommer", en: "Chalet Hotel Hartmann in summer" } },
    ],
  },
  "hotel-acadia": {
    hero: { file: "acadia-esterno", width: 900, height: 600, alt: { it: "Acadia Mountain Home a Selva di Val Gardena con le Dolomiti sullo sfondo", de: "Acadia Mountain Home in Wolkenstein mit den Dolomiten im Hintergrund", en: "Acadia Mountain Home in Selva di Val Gardena with the Dolomites behind" } },
    gallery: [
      { file: "acadia-camera", width: 420, height: 410, alt: { it: "Acadia Mountain Home: camera", de: "Acadia Mountain Home: Zimmer", en: "Acadia Mountain Home: room" } },
      { file: "acadia-wellness", width: 420, height: 410, alt: { it: "Acadia Mountain Home: area wellness con sauna", de: "Acadia Mountain Home: Wellnessbereich mit Sauna", en: "Acadia Mountain Home: wellness area with sauna" } },
      { file: "acadia-inverno", width: 596, height: 397, alt: { it: "Acadia Mountain Home d'inverno, accanto alle piste di Selva", de: "Acadia Mountain Home im Winter, neben den Pisten von Wolkenstein", en: "Acadia Mountain Home in winter, next to the Selva slopes" } },
      { file: "acadia-colazione", width: 800, height: 533, alt: { it: "Acadia Mountain Home: buffet della colazione", de: "Acadia Mountain Home: Frühstücksbuffet", en: "Acadia Mountain Home: breakfast buffet" } },
    ],
  },
};

/** <picture> WebP con ripiego JPEG; caricamento differito tranne l'immagine principale. */
export function pictureHtml(base: string, p: Photo, lang: L, opts: { eager?: boolean; cls?: string } = {}): string {
  const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const load = opts.eager ? `fetchpriority="high"` : `loading="lazy"`;
  return `<picture${opts.cls ? ` class="${opts.cls}"` : ""}><source srcset="${base}/foto/${p.file}.webp" type="image/webp"><img src="${base}/foto/${p.file}.jpg" alt="${esc(p.alt[lang])}" width="${p.width}" height="${p.height}" ${load} decoding="async"></picture>`;
}

export function photoUrls(base: string, slug: string): string[] {
  const set = PHOTOS[slug];
  return set ? [set.hero, ...set.gallery].map((p) => `${base}/foto/${p.file}.jpg`) : [];
}

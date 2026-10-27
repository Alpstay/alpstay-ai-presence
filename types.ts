/**
 * Tipi della piattaforma "AlpStay AI Presence".
 * Regola: tutto ciò che viene pubblicato deriva da data/facts.json (fatti verificati)
 * oppure da La Scatola (solo viste PII-free). Nessun dato ospite esce mai da qui.
 */

export type Lang = "it" | "en" | "de";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Address {
  street: string;
  postalCode: string;
  locality: string; // Ortisei / Selva di Val Gardena
  region: string; // Alto Adige - Südtirol
  country: "IT";
}

export interface SeasonWindow {
  /** "MM-DD" inclusivo */
  from: string;
  /** "MM-DD" inclusivo */
  to: string;
  label: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface Property {
  /** Slug URL, es. "chalet-hotel-hartmann" */
  slug: string;
  /** ID struttura in La Scatola / Slope. MAI modificare. */
  scatolaPropertyId: string;
  name: string;
  /** schema.org type */
  schemaType: "Hotel" | "LodgingBusiness";
  tagline: string;
  description: string;
  website: string;
  bookingUrl: string;
  address: Address;
  geo?: GeoPoint;
  googleMapsUrl?: string;
  rooms: number;
  roomTypes?: Array<{ name: string; quantity: number }>;
  amenities: string[];
  /** Fatti puntuali e verificati (orari, servizi, accessi). */
  facts: string[];
  checkIn?: string;
  checkOut?: string;
  faqs: Faq[];
}

export interface Experience {
  name: string;
  season: Array<"inverno" | "primavera" | "estate" | "autunno">;
  summary: string;
  url?: string;
}

export interface NewsItem {
  /** ISO date YYYY-MM-DD */
  date: string;
  title: string;
  body: string;
  url?: string;
}

export interface Facts {
  brand: {
    name: string;
    legalName: string;
    payoff: string;
    website: string;
    conciergeUrl: string;
    email: string;
    description: string;
    /** URL dove viene pubblicato questo sito (GitHub Pages o ai.alpstay.eu) */
    publishBaseUrl: string;
    sameAs: string[];
  };
  destination: {
    name: string;
    region: string;
    summary: string;
    highlights: string[];
  };
  seasons: {
    summer: SeasonWindow;
    winter: SeasonWindow;
  };
  properties: Property[];
  experiences: Experience[];
  faqs: Faq[];
  news: NewsItem[];
}

/** Riga aggregata di curated_availability_daily (La Scatola) */
export interface AvailabilityDay {
  property_id: string;
  day: string; // YYYY-MM-DD
  physical_rooms: number;
  free_after_options: number;
}

/** Sintesi di disponibilità per finestra temporale, pubblicabile */
export interface AvailabilityWindow {
  key: string; // es. "capodanno-2026"
  label: string;
  from: string;
  to: string;
  properties: Array<{
    slug: string;
    name: string;
    /** minimo di camere libere in tutte le notti della finestra */
    minFreeRooms: number;
    /** stato semplice per l'IA */
    status: "disponibile" | "ultime-camere" | "esaurito" | "n/d";
  }>;
}

export interface LiveSnapshot {
  fetchedAt: string;
  freshness: "ok" | "stale" | "unavailable";
  windows: AvailabilityWindow[];
}

/** Modello finale usato dai renderer */
export interface SiteModel {
  facts: Facts;
  live: LiveSnapshot;
  builtAt: string;
  contentHash: string;
  /** Notizie generate dal calendario (apertura stagione ecc.) + news manuali */
  updates: NewsItem[];
}

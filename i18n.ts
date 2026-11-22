/**
 * Traduzioni della piattaforma. facts.json (italiano) resta l'unica fonte dei dati:
 * i file i18n/<lingua>.json contengono SOLO testi tradotti. ID, URL, numeri di camere,
 * indirizzi (via e CAP) e link di prenotazione vengono sempre da facts.json, identici.
 */
import type { Facts, Faq, Lang } from "./types.js";

export interface PropertyTranslation {
  locality: string;
  tagline: string;
  description: string;
  /** stessi elementi e stesso ordine di facts.json (vuoto se la struttura non ha roomTypes) */
  roomTypes: string[];
  amenities: string[];
  facts: string[];
  faqs: Faq[];
}

export interface Translation {
  brand: { description: string };
  destination: { name: string; region: string; summary: string; highlights: string[] };
  seasons: { summer: string; winter: string };
  properties: Record<string, PropertyTranslation>;
  experiences: Array<{ name: string; summary: string }>;
  faqs: Faq[];
}

function sameLength(path: string, a: unknown[] | undefined, b: unknown[], errors: string[]): void {
  if ((a?.length ?? 0) !== b.length) errors.push(`${path}: ${b.length} voci tradotte, ${a?.length ?? 0} in facts.json`);
}

/**
 * Restituisce una copia di facts con i testi tradotti. Se la traduzione non corrisponde
 * voce per voce a facts.json il build si ferma: meglio nessuna pagina che una pagina sbagliata.
 */
export function localize(facts: Facts, t: Translation, lang: Lang): Facts {
  const errors: string[] = [];
  sameLength(`${lang}.destination.highlights`, facts.destination.highlights, t.destination.highlights, errors);
  sameLength(`${lang}.experiences`, facts.experiences, t.experiences, errors);
  sameLength(`${lang}.faqs`, facts.faqs, t.faqs, errors);
  for (const p of facts.properties) {
    const pt = t.properties[p.slug];
    if (!pt) {
      errors.push(`${lang}.properties.${p.slug}: traduzione mancante`);
      continue;
    }
    sameLength(`${lang}.${p.slug}.roomTypes`, p.roomTypes ?? [], pt.roomTypes, errors);
    sameLength(`${lang}.${p.slug}.amenities`, p.amenities, pt.amenities, errors);
    sameLength(`${lang}.${p.slug}.facts`, p.facts, pt.facts, errors);
    sameLength(`${lang}.${p.slug}.faqs`, p.faqs, pt.faqs, errors);
  }
  if (errors.length) throw new Error(`traduzione ${lang} non allineata a facts.json:\n- ${errors.join("\n- ")}`);

  return {
    ...facts,
    brand: { ...facts.brand, description: t.brand.description },
    destination: { ...facts.destination, ...t.destination },
    seasons: {
      summer: { ...facts.seasons.summer, label: t.seasons.summer },
      winter: { ...facts.seasons.winter, label: t.seasons.winter },
    },
    properties: facts.properties.map((p) => {
      const pt = t.properties[p.slug]!;
      return {
        ...p, // slug, scatolaPropertyId, URL, camere: invariati
        address: { ...p.address, locality: pt.locality },
        tagline: pt.tagline,
        description: pt.description,
        roomTypes: p.roomTypes?.map((r, i) => ({ ...r, name: pt.roomTypes[i]! })),
        amenities: pt.amenities,
        facts: pt.facts,
        faqs: pt.faqs,
      };
    }),
    experiences: facts.experiences.map((e, i) => ({ ...e, ...t.experiences[i]! })),
    faqs: t.faqs,
  };
}

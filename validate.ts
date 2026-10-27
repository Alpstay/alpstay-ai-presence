import type { Facts } from "./types.js";

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

const PLACEHOLDER = /\b(TODO|TBD|lorem|xxx|\?\?\?)\b/i;

function checkText(path: string, value: string, out: ValidationResult, required = true): void {
  if (!value || value.trim() === "") {
    if (required) out.errors.push(`${path}: vuoto`);
    else out.warnings.push(`${path}: vuoto (campo facoltativo, non pubblicato)`);
    return;
  }
  if (PLACEHOLDER.test(value)) out.errors.push(`${path}: contiene un segnaposto ("${value.slice(0, 40)}…")`);
}

function checkUrl(path: string, value: string, out: ValidationResult): void {
  checkText(path, value, out);
  if (value && !/^https:\/\//.test(value)) out.errors.push(`${path}: deve essere un URL https`);
}

/**
 * Il build fallisce se ci sono errori: niente dati incompleti o segnaposto
 * finiscono online. Le avvertenze vengono stampate e basta.
 */
export function validateFacts(f: Facts): ValidationResult {
  const out: ValidationResult = { errors: [], warnings: [] };

  checkText("brand.name", f.brand.name, out);
  checkText("brand.description", f.brand.description, out);
  checkUrl("brand.website", f.brand.website, out);
  checkUrl("brand.conciergeUrl", f.brand.conciergeUrl, out);
  checkUrl("brand.publishBaseUrl", f.brand.publishBaseUrl, out);
  if (!/^[^@\s]+@[^@\s]+\.[a-z]+$/i.test(f.brand.email)) out.errors.push("brand.email non valida");

  for (const key of ["summer", "winter"] as const) {
    const s = f.seasons[key];
    if (!/^\d{2}-\d{2}$/.test(s.from) || !/^\d{2}-\d{2}$/.test(s.to)) out.errors.push(`seasons.${key}: formato MM-DD`);
  }

  const slugs = new Set<string>();
  const ids = new Set<string>();
  f.properties.forEach((p, i) => {
    const base = `properties[${i}] (${p.slug || "?"})`;
    if (!/^[a-z0-9-]+$/.test(p.slug)) out.errors.push(`${base}: slug non valido`);
    if (slugs.has(p.slug)) out.errors.push(`${base}: slug duplicato`);
    slugs.add(p.slug);
    if (!/^[0-9a-f-]{36}$/.test(p.scatolaPropertyId)) out.errors.push(`${base}: scatolaPropertyId non è un uuid`);
    if (ids.has(p.scatolaPropertyId)) out.errors.push(`${base}: scatolaPropertyId duplicato`);
    ids.add(p.scatolaPropertyId);
    checkText(`${base}.name`, p.name, out);
    checkText(`${base}.description`, p.description, out);
    checkUrl(`${base}.website`, p.website, out);
    checkUrl(`${base}.bookingUrl`, p.bookingUrl, out);
    checkText(`${base}.address.street`, p.address.street, out, false);
    checkText(`${base}.address.locality`, p.address.locality, out);
    if (!Number.isInteger(p.rooms) || p.rooms <= 0) out.errors.push(`${base}.rooms: numero non valido`);
    if (p.roomTypes) {
      const sum = p.roomTypes.reduce((a, r) => a + r.quantity, 0);
      if (sum !== p.rooms) out.errors.push(`${base}: roomTypes (${sum}) non coincide con rooms (${p.rooms})`);
    }
    p.amenities.forEach((a, j) => checkText(`${base}.amenities[${j}]`, a, out));
    p.facts.forEach((a, j) => checkText(`${base}.facts[${j}]`, a, out));
    p.faqs.forEach((q, j) => {
      checkText(`${base}.faqs[${j}].q`, q.q, out);
      checkText(`${base}.faqs[${j}].a`, q.a, out);
    });
  });

  f.faqs.forEach((q, j) => {
    checkText(`faqs[${j}].q`, q.q, out);
    checkText(`faqs[${j}].a`, q.a, out);
  });
  f.news.forEach((n, j) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(n.date)) out.errors.push(`news[${j}].date: formato YYYY-MM-DD`);
    checkText(`news[${j}].title`, n.title, out);
    checkText(`news[${j}].body`, n.body, out);
  });

  return out;
}

/**
 * Disponibilità live da La Scatola (vista curated_availability_daily, PII-free).
 * Pubblichiamo SOLO conteggi aggregati di camere libere per finestra temporale.
 * Nessuna prenotazione, nessun ospite, nessun prezzo esce da qui.
 *
 * Variabili d'ambiente (secrets GitHub):
 *   DATABOX_URL    es. https://databox.alpstay.eu   (gateway /api/v1)
 *   DATABOX_TOKEN  bearer del client registrato per questa app
 * Se mancano, il build prosegue con freshness = "unavailable".
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AvailabilityDay, AvailabilityWindow, Facts, LiveSnapshot, Property } from "./types.js";

interface QueryEnvelope {
  data: Array<Record<string, unknown>>;
  freshness?: { overall?: { status?: string }; sources?: Array<{ last_success_at?: string }> };
  page?: { truncated?: boolean; next_cursor?: string | null };
}

const MAX_CALLS = 60;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function* eachDay(from: string, to: string): Generator<string> {
  let d = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (d <= end) {
    yield iso(d);
    d = addDays(d, 1);
  }
}

/** Finestre che interessano chi chiede all'IA "c'è posto a …?" */
export function buildWindows(today: Date, facts: Facts): Array<{ key: string; label: string; from: string; to: string }> {
  const y = today.getUTCFullYear();
  const t = iso(today);
  const candidates = [
    { key: "prossimi-7-giorni", label: "Prossimi 7 giorni", from: t, to: iso(addDays(today, 6)) },
    { key: `natale-${y}`, label: `Natale ${y}`, from: `${y}-12-22`, to: `${y}-12-26` },
    { key: `capodanno-${y}`, label: `Capodanno ${y}/${y + 1}`, from: `${y}-12-27`, to: `${y + 1}-01-03` },
    { key: `settimana-bianca-${y + 1}`, label: `Settimana bianca febbraio ${y + 1}`, from: `${y + 1}-02-14`, to: `${y + 1}-02-21` },
    { key: `ferragosto-${y}`, label: `Ferragosto ${y}`, from: `${y}-08-10`, to: `${y}-08-20` },
    { key: `ferragosto-${y + 1}`, label: `Ferragosto ${y + 1}`, from: `${y + 1}-08-10`, to: `${y + 1}-08-20` },
  ];
  // Periodi più difficili da vendere (scelta del titolare, 22/11/2026): inizio dicembre e marzo a settimane,
  // settembre e ottobre a quindicine. Prossima occorrenza di ciascuno.
  for (const [mdFrom, mdTo] of LOW_SEASON) {
    let yy = y;
    if (`${yy}-${mdTo}` < t) yy++;
    const from = `${yy}-${mdFrom}`, to = `${yy}-${mdTo}`;
    candidates.push({ key: `bassa-${from}-${to}`, label: rangeLabelIt(from, to), from, to });
  }
  // solo finestre future (entro 400 giorni) e dentro le stagioni di apertura, in ordine di data
  return candidates
    .filter((w) => w.to >= t && w.from <= iso(addDays(today, 400)) && inSeason(w.from, facts))
    .sort((a, b) => a.from.localeCompare(b.from));
}

/** Periodi di bassa stagione pubblicati (MM-DD inclusivi). Tenere allineato con tools/finestre.mjs. */
export const LOW_SEASON: Array<[string, string]> = [
  ["12-01", "12-07"], ["12-08", "12-14"], ["12-15", "12-21"],
  ["03-01", "03-07"], ["03-08", "03-14"], ["03-15", "03-21"], ["03-22", "03-31"],
  ["09-01", "09-15"], ["09-16", "09-30"],
  ["10-01", "10-15"], ["10-16", "10-31"],
];
const MESI_IT = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
function rangeLabelIt(from: string, to: string): string {
  return `${Number(from.slice(8))}–${Number(to.slice(8))} ${MESI_IT[Number(from.slice(5, 7)) - 1]} ${from.slice(0, 4)}`;
}

function inSeason(dayIso: string, facts: Facts): boolean {
  const md = dayIso.slice(5);
  const { summer, winter } = facts.seasons;
  const inRange = (from: string, to: string): boolean => (from <= to ? md >= from && md <= to : md >= from || md <= to);
  return inRange(summer.from, summer.to) || inRange(winter.from, winter.to);
}

async function queryDay(baseUrl: string, token: string, day: string): Promise<{ rows: AvailabilityDay[]; status: string; lastSuccess?: string }> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/query`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      view: "curated_availability_daily",
      filters: [{ field: "day", op: "eq", value: day }],
      limit: 500,
    }),
  });
  if (!res.ok) throw new Error(`databox ${res.status} per ${day}`);
  const env = (await res.json()) as QueryEnvelope;
  const rows: AvailabilityDay[] = env.data.map((r) => ({
    property_id: String(r.property_id),
    day: String(r.day),
    physical_rooms: Number(r.physical_rooms ?? 0),
    free_after_options: Number(r.free_after_options ?? 0),
  }));
  const lastSuccess = env.freshness?.sources
    ?.map((s) => s.last_success_at)
    .filter((s): s is string => !!s)
    .sort()
    .at(-1);
  return { rows, status: env.freshness?.overall?.status ?? "unknown", lastSuccess };
}

function statusOf(free: number): AvailabilityWindow["properties"][number]["status"] {
  if (free >= 3) return "disponibile";
  if (free >= 1) return "ultime-camere";
  return "esaurito";
}

type DaySource = (day: string) => Promise<{ rows: AvailabilityDay[]; status: string }>;

/** Massimo di ore di vecchiaia accettate per disponibilita.json prima di dichiararlo "stale" / non pubblicarlo. */
const FILE_STALE_HOURS = 30;
const FILE_MAX_HOURS = 24 * 7;

interface DisponibilitaFile {
  generatedAt: string;
  scatolaStatus?: string;
  /** giorno → property_id (verbatim da La Scatola) → camere OCCUPATE (physical_rooms - free_after_options, overbooking compreso) */
  days: Record<string, Record<string, number>>;
}

/**
 * Fonte 2: file disponibilita.json scritto ogni mattina dall'attività pianificata
 * (connettore La Scatola, vista curated_availability_daily, solo conteggi aggregati).
 */
async function fileSource(today: Date): Promise<{ source: DaySource; stale: boolean; generatedAt: string } | null> {
  const ROOT = new URL(".", import.meta.url).pathname;
  let f: DisponibilitaFile;
  try {
    f = JSON.parse(await readFile(join(ROOT, "disponibilita.json"), "utf8")) as DisponibilitaFile;
  } catch {
    return null;
  }
  const ageH = (today.getTime() - new Date(f.generatedAt).getTime()) / 3_600_000;
  if (!Number.isFinite(ageH) || ageH > FILE_MAX_HOURS) {
    console.log(`live: disponibilita.json troppo vecchio (${Math.round(ageH)} h) → non pubblicato`);
    return null;
  }
  const stale = ageH > FILE_STALE_HOURS || f.scatolaStatus === "failing" || f.scatolaStatus === "stale";
  console.log(`live: uso disponibilita.json del ${f.generatedAt} (${Math.round(ageH)} h, Scatola: ${f.scatolaStatus ?? "?"})`);
  const source: DaySource = async (day) => {
    const perProp = f.days[day];
    if (!perProp) throw new Error(`giorno ${day} assente nel file`);
    return {
      // riga sintetica: physical = 0, free = -occupate → occupate = physical - free
      rows: Object.entries(perProp).map(([property_id, occ]) => ({ property_id, day, physical_rooms: 0, free_after_options: -occ })),
      status: stale ? "stale" : "ok",
    };
  };
  return { source, stale, generatedAt: f.generatedAt };
}

/** prezzi.json (tools/prezzi.mjs): prezzo indicativo per notte, per giorno e property_id. */
interface PrezziFile { generatedAt: string; nights: Record<string, Record<string, { p: number; src: string }>> }
const PRICE_MAX_HOURS = 48;
async function loadPrices(today: Date): Promise<PrezziFile | null> {
  try {
    const ROOT = new URL(".", import.meta.url).pathname;
    const f = JSON.parse(await readFile(join(ROOT, "prezzi.json"), "utf8")) as PrezziFile;
    const ageH = (today.getTime() - new Date(f.generatedAt).getTime()) / 3_600_000;
    if (!Number.isFinite(ageH) || ageH > PRICE_MAX_HOURS) {
      console.log(`live: prezzi.json troppo vecchio (${Math.round(ageH)} h) → prezzi non pubblicati`);
      return null;
    }
    return f;
  } catch {
    return null;
  }
}
/** Media delle notti con prezzo, pubblicata solo se copre almeno metà delle notti aperte del periodo. */
function windowPrice(prices: PrezziFile | null, propertyId: string, days: string[]): number | undefined {
  if (!prices || days.length === 0) return undefined;
  const vals = days.map((d) => prices.nights[d]?.[propertyId]?.p).filter((v): v is number => typeof v === "number" && v > 0);
  if (vals.length * 2 < days.length) return undefined;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length / 10) * 10;
}

export async function fetchLive(facts: Facts, today = new Date()): Promise<LiveSnapshot> {
  const baseUrl = process.env.DATABOX_URL;
  const token = process.env.DATABOX_TOKEN;
  let fetchedAt = today.toISOString();
  let source: DaySource;
  if (baseUrl && token) {
    source = (day) => queryDay(baseUrl, token, day);
  } else {
    const fs = await fileSource(today);
    if (!fs) {
      console.log("live: né DATABOX_URL/DATABOX_TOKEN né disponibilita.json valido → disponibilità non pubblicata");
      return { fetchedAt, freshness: "unavailable", windows: [] };
    }
    source = fs.source;
    fetchedAt = fs.generatedAt;
  }

  const windows = buildWindows(today, facts);
  const prices = await loadPrices(today);
  const byId = new Map<string, Property>(facts.properties.map((p) => [p.scatolaPropertyId, p]));
  const out: AvailabilityWindow[] = [];
  let calls = 0;
  let anyFailing = false;

  for (const w of windows) {
    // min camere libere per struttura su tutte le notti della finestra
    const minFree = new Map<string, number>();
    const freeNights = new Map<string, number>();
    let nights = 0;
    const openDays: string[] = [];
    try {
      for (const day of eachDay(w.from, w.to)) {
        if (!inSeason(day, facts)) continue; // hotel chiusi: la notte non conta
        if (calls++ >= MAX_CALLS * 10) throw new Error("limite giorni raggiunto");
        const { rows, status } = await source(day);
        if (status === "failing" || status === "stale") anyFailing = true;
        const perProp = new Map<string, number>();
        for (const r of rows) {
          if (!byId.has(r.property_id)) continue; // struttura non censita in facts.json: ignora
          // camere occupate per hotel (overbooking compreso); una tipologia senza righe è tutta libera
          perProp.set(r.property_id, (perProp.get(r.property_id) ?? 0) + (r.physical_rooms - r.free_after_options));
        }
        nights++;
        openDays.push(day);
        for (const [id, p] of byId) {
          const free = Math.max(0, p.rooms - (perProp.get(id) ?? 0));
          minFree.set(id, Math.min(minFree.get(id) ?? Number.POSITIVE_INFINITY, free));
          if (free > 0) freeNights.set(id, (freeNights.get(id) ?? 0) + 1);
        }
      }
    } catch (e) {
      console.warn(`live: finestra ${w.key} saltata: ${(e as Error).message}`);
      continue;
    }
    if (minFree.size === 0) continue; // nessuna notte aperta nella finestra
    out.push({
      key: w.key,
      label: w.label,
      from: w.from,
      to: w.to,
      properties: facts.properties.map((p) => {
        const free = minFree.get(p.scatolaPropertyId);
        const n = free === undefined || !Number.isFinite(free) ? -1 : free;
        const fn = freeNights.get(p.scatolaPropertyId) ?? 0;
        const status = n < 0 ? "n/d" : n === 0 && fn > 0 ? "parziale" : statusOf(n);
        const priceIndicative = status === "esaurito" ? undefined : windowPrice(prices, p.scatolaPropertyId, openDays);
        return { slug: p.slug, name: p.name, minFreeRooms: Math.max(n, 0), status, nightsAvailable: fn, nights, ...(priceIndicative ? { priceIndicative } : {}) };
      }),
    });
  }

  return { fetchedAt, freshness: out.length === 0 ? "unavailable" : anyFailing ? "stale" : "ok", windows: out };
}

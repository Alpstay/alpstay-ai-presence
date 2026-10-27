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
  // solo finestre future (entro 400 giorni) e dentro le stagioni di apertura
  return candidates.filter((w) => w.to >= t && w.from <= iso(addDays(today, 400)) && inSeason(w.from, facts));
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

export async function fetchLive(facts: Facts, today = new Date()): Promise<LiveSnapshot> {
  const baseUrl = process.env.DATABOX_URL;
  const token = process.env.DATABOX_TOKEN;
  const fetchedAt = today.toISOString();
  if (!baseUrl || !token) {
    console.log("live: DATABOX_URL/DATABOX_TOKEN assenti → disponibilità non pubblicata");
    return { fetchedAt, freshness: "unavailable", windows: [] };
  }

  const windows = buildWindows(today, facts);
  const byId = new Map<string, Property>(facts.properties.map((p) => [p.scatolaPropertyId, p]));
  const out: AvailabilityWindow[] = [];
  let calls = 0;
  let anyFailing = false;

  for (const w of windows) {
    // min camere libere per struttura su tutte le notti della finestra
    const minFree = new Map<string, number>();
    try {
      for (const day of eachDay(w.from, w.to)) {
        if (!inSeason(day, facts)) continue; // hotel chiusi: la notte non conta
        if (calls++ >= MAX_CALLS) throw new Error("limite chiamate raggiunto");
        const { rows, status } = await queryDay(baseUrl, token, day);
        if (status === "failing" || status === "stale") anyFailing = true;
        const perProp = new Map<string, number>();
        for (const r of rows) {
          if (!byId.has(r.property_id)) continue; // struttura non censita in facts.json: ignora
          perProp.set(r.property_id, (perProp.get(r.property_id) ?? 0) + Math.max(0, r.free_after_options));
        }
        for (const [id] of byId) {
          const free = perProp.get(id) ?? 0;
          minFree.set(id, Math.min(minFree.get(id) ?? Number.POSITIVE_INFINITY, free));
        }
      }
    } catch (e) {
      console.warn(`live: finestra ${w.key} saltata: ${(e as Error).message}`);
      continue;
    }
    out.push({
      key: w.key,
      label: w.label,
      from: w.from,
      to: w.to,
      properties: facts.properties.map((p) => {
        const free = minFree.get(p.scatolaPropertyId);
        const n = free === undefined || !Number.isFinite(free) ? -1 : free;
        return { slug: p.slug, name: p.name, minFreeRooms: Math.max(n, 0), status: n < 0 ? "n/d" : statusOf(n) };
      }),
    });
  }

  return { fetchedAt, freshness: out.length === 0 ? "unavailable" : anyFailing ? "stale" : "ok", windows: out };
}

#!/usr/bin/env node
/**
 * Costruisce prezzi.json: prezzo INDICATIVO per notte della camera doppia di riferimento,
 * con la stessa regola di Offerta Studio (decisa dal titolare il 16/11/2026), resa più prudente
 * per la pubblicazione:
 *   per ogni notte e casa, tra le prenotazioni della tipologia di riferimento (gruppi di 3+ camere esclusi)
 *   create negli ultimi 90 giorni, si prende la più recente:
 *     - vendita diretta (BOOKING_ENGINE / DIRECT) → prezzo medio per notte +8%
 *     - altrimenti vendita OTA → prezzo medio per notte −8%
 *   Nessuna vendita recente → nessun prezzo (l'anno scorso NON si usa sulla pagina pubblica).
 *   Si preferiscono le prenotazioni con 2 persone (camera doppia).
 * Uso: node tools/prezzi.mjs --registro --da <ISO> > prezzi.json
 *   Legge le chiamate query_curated_view su curated_reservations fatte in QUESTA sessione dal registro
 *   di Claude. Nel file finiscono SOLO date, property_id (identici, mai modificati) e prezzi calcolati:
 *   nessun dato di prenotazione o dell'ospite.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const RANK = { fresh: 0, ok: 0, stale: 1, unavailable: 2, failing: 2 };
const SAVED = /saved to:?\s+(\/\S+?\.(?:txt|json))(?=[.,;)\s]|$)/i;
const isRec = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Riconosce una pagina {data, freshness, page} in testo, JSON annidato o blocchi di contenuto. */
function asPage(v, depth = 0) {
  if (depth > 4) return null;
  if (typeof v === "string") {
    const t = v.trim();
    if (/^[{["]/.test(t)) { try { return asPage(JSON.parse(t), depth + 1); } catch { /* sotto */ } }
    const i = t.indexOf('{"data"');
    if (i >= 0) { try { return asPage(JSON.parse(t.slice(i, t.lastIndexOf("}") + 1)), depth + 1); } catch { /* niente */ } }
    const saved = SAVED.exec(t);
    if (saved && existsSync(saved[1])) return asPage(readFileSync(saved[1], "utf8"), depth + 1);
    return null;
  }
  if (Array.isArray(v)) return asPage(v.map((b) => (isRec(b) && typeof b.text === "string" ? b.text : "")).join(""), depth + 1);
  if (isRec(v) && Array.isArray(v.data)) return v;
  return null;
}

function newestTranscript() {
  const found = [];
  const walk = (dir, depth) => {
    let names = [];
    try { names = readdirSync(dir); } catch { return; }
    for (const n of names) {
      const p = join(dir, n);
      try {
        const st = statSync(p);
        if (st.isDirectory()) { if (depth < 5) walk(p, depth + 1); }
        else if (n.endsWith(".jsonl")) found.push({ p, m: st.mtimeMs });
      } catch { /* ignora */ }
    }
  };
  walk(join(homedir(), ".claude", "projects"), 0);
  found.sort((a, b) => b.m - a.m);
  return found[0]?.p ?? null;
}


const REF = {
  "33333333-3333-4333-8333-333333333333": "c570daf6-0bbc-4e10-a504-12f52133cecd", // Saslong, doppia
  "22222222-2222-4222-8222-222222222222": "e7ed86b2-31da-4888-8c4a-cc758a79b518", // Hartmann, riferimento Offerta Studio
  "11111111-1111-4111-8111-111111111111": "b6ab55db-0f9b-4cfb-8da3-4b167e3064bc", // Acadia, riferimento Offerta Studio
};
const RECENT_DAYS = 90, DIR_UP = 0.08, OTA_DOWN = 0.08, GROUP_ROOMS = 3;

function pagesFromTranscript(since) {
  const file = newestTranscript();
  if (!file) throw new Error("registro della sessione non trovato");
  const calls = new Map();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.includes("tool_use") && !line.includes("tool_result")) continue;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    if (!isRec(o?.message) || !Array.isArray(o.message.content)) continue;
    const at = typeof o.timestamp === "string" ? o.timestamp : "";
    for (const b of o.message.content) {
      if (!isRec(b)) continue;
      if (b.type === "tool_use" && /scatola/i.test(String(b.name)) && /query_curated_view$/.test(String(b.name))
          && b.input?.view === "curated_reservations" && at >= since) {
        calls.set(b.id, null);
      } else if (b.type === "tool_result" && calls.has(b.tool_use_id) && b.is_error !== true) {
        calls.set(b.tool_use_id, asPage(b.content));
      }
    }
  }
  const pages = [...calls.values()].filter(Boolean);
  console.error(`registro: ${calls.size} chiamate su curated_reservations, ${pages.length} risposte valide`);
  return pages;
}

const args = process.argv.slice(2);
const si = args.indexOf("--da");
const since = si >= 0 ? args[si + 1] : "";
const pages = pagesFromTranscript(since);
if (pages.length === 0) { console.error("ERRORE: nessuna risposta di La Scatola: non pubblicare."); process.exit(1); }

const now = new Date();
const minCreated = new Date(now.getTime() - RECENT_DAYS * 86_400_000).toISOString();
const addDays = (d, n) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

// righe uniche, solo i campi necessari
const rows = new Map();
let worst = "fresh";
for (const env of pages) {
  const st = env.freshness?.overall?.status;
  if (st && (RANK[st] ?? 1) > (RANK[worst] ?? 0)) worst = st;
  for (const r of env.data) {
    if (!UUID.test(String(r.property_id)) || !REF[r.property_id]) continue;
    rows.set(String(r.reservation_id), {
      property_id: String(r.property_id), type: String(r.lodging_type_id), order: String(r.order_id ?? ""),
      arrival: String(r.arrival).slice(0, 10), departure: String(r.departure).slice(0, 10),
      persons: (Number(r.adults) || 0) + (Number(r.children) || 0), created: String(r.creation_date ?? ""),
      canceled: r.is_canceled === true, nightly: Number(r.room_amount) / Math.max(1, Number(r.room_nights) || 0),
      direct: r.channel_bucket === "direct" || ["BOOKING_ENGINE", "DIRECT"].includes(String(r.channel)),
      ota: String(r.channel_bucket) === "ota",
    });
  }
}
const perOrder = new Map();
for (const r of rows.values()) if (r.order) perOrder.set(`${r.property_id}|${r.order}`, (perOrder.get(`${r.property_id}|${r.order}`) ?? 0) + 1);
const pool = [...rows.values()].filter((r) => !r.canceled && r.type === REF[r.property_id] && r.created >= minCreated
  && (r.direct || r.ota) && r.nightly > 0 && (perOrder.get(`${r.property_id}|${r.order}`) ?? 0) < GROUP_ROOMS);

const nights = {};
let priced = 0;
const dates = new Set();
for (const r of pool) for (let d = r.arrival; d < r.departure; d = addDays(d, 1)) dates.add(d);
for (const d of [...dates].sort()) {
  for (const pid of Object.keys(REF)) {
    const cover = pool.filter((r) => r.property_id === pid && r.arrival <= d && r.departure > d);
    if (!cover.length) continue;
    const pick = (list) => list.sort((a, b) => b.created.localeCompare(a.created))[0];
    const two = (list) => (list.some((r) => r.persons === 2) ? list.filter((r) => r.persons === 2) : list);
    const dir = cover.filter((r) => r.direct), ota = cover.filter((r) => r.ota);
    let p, src;
    if (dir.length) { p = pick(two(dir)).nightly * (1 + DIR_UP); src = "diretta"; }
    else { p = pick(two(ota)).nightly * (1 - OTA_DOWN); src = "ota"; }
    (nights[d] ??= {})[pid] = { p: Math.round(p), src };
    priced++;
  }
}
if (priced === 0) { console.error("ERRORE: nessun prezzo calcolabile: non pubblicare."); process.exit(1); }
process.stdout.write(JSON.stringify({
  generatedAt: now.toISOString(), source: "La Scatola · curated_reservations", scatolaStatus: worst,
  rule: `ultima vendita recente (≤${RECENT_DAYS} giorni) della camera di riferimento: diretta +${DIR_UP * 100}%, altrimenti OTA −${OTA_DOWN * 100}%; gruppi esclusi`,
  nights,
}, null, 1) + "\n");
console.error(`RIEPILOGO: ${rows.size} prenotazioni lette, ${pool.length} utili, ${priced} notti-casa con prezzo, Scatola: ${worst}`);

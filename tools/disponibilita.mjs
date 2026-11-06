#!/usr/bin/env node
/**
 * Costruisce disponibilita.json dalle risposte di La Scatola (vista curated_availability_daily).
 *
 * Uso consigliato (attività pianificata):
 *   node tools/disponibilita.mjs --registro > disponibilita.json
 *   Legge le chiamate query_curated_view su curated_availability_daily fatte in QUESTA sessione
 *   direttamente dal registro di Claude (~/.claude/projects/**.jsonl): i numeri non vengono
 *   mai ricopiati a mano. Le risposte grandi salvate su file dal sistema vengono aperte da sole.
 * Uso alternativo (prove): node tools/disponibilita.mjs risposta1.json [risposta2.json ...]
 *
 * Valore per giorno e hotel = camere OCCUPATE = somma di (physical_rooms - free_after_options).
 * Le libere si calcolano poi come camere totali (facts.json) - occupate: una tipologia senza righe
 * in un giorno è tutta libera. Ogni giorno chiesto compare nel file, anche se senza righe.
 * Si tengono SOLO property_id, day, physical_rooms, free_after_options: la vista non contiene dati ospite.
 * Gli ID di La Scatola / Slope sono copiati identici, mai modificati.
 * Con --da <ISO> si considerano solo le chiamate successive a quell'istante.
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

/** Pagine delle chiamate a curated_availability_daily presenti nel registro della sessione. */
const cover = [];
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
          && b.input?.view === "curated_availability_daily" && at >= since) {
        calls.set(b.id, null);
        for (const f of b.input.filters ?? []) if (f.field === "day") cover.push([f.op, String(f.value)]);
      } else if (b.type === "tool_result" && calls.has(b.tool_use_id) && b.is_error !== true) {
        calls.set(b.tool_use_id, asPage(b.content));
      }
    }
  }
  const pages = [...calls.values()].filter(Boolean);
  console.error(`registro: ${calls.size} chiamate su curated_availability_daily, ${pages.length} risposte valide`);
  return pages;
}

const args = process.argv.slice(2);
const sinceIdx = args.indexOf("--da");
const since = sinceIdx >= 0 ? args[sinceIdx + 1] : "";
const pages = args.includes("--registro")
  ? pagesFromTranscript(since)
  : args.filter((a, i) => !a.startsWith("--") && !(sinceIdx >= 0 && i === sinceIdx + 1))
      .map((f) => asPage(readFileSync(f, "utf8"))).filter(Boolean);

if (pages.length === 0) {
  console.error("ERRORE: nessuna risposta di La Scatola trovata: non pubblicare.");
  process.exit(1);
}

const days = {};
const seen = new Set();
let worst = "fresh";
let rows = 0;
let truncated = false;
for (const env of pages) {
  const st = env.freshness?.overall?.status;
  if (st && (RANK[st] ?? 1) > (RANK[worst] ?? 0)) worst = st;
  if (env.page?.next_cursor) truncated = true;
  for (const r of env.data) {
    if (!UUID.test(String(r.property_id)) || !DAY.test(String(r.day))) continue;
    const key = `${r.property_id}|${r.lodging_type_id}|${r.day}`;
    if (seen.has(key)) continue; // chiamate sovrapposte: non contare due volte
    seen.add(key);
    // camere occupate (overbooking compreso): physical_rooms - free_after_options
    const occ = (Number(r.physical_rooms) || 0) - (Number(r.free_after_options) || 0);
    (days[r.day] ??= {})[r.property_id] = (days[r.day][r.property_id] ?? 0) + occ;
    rows++;
  }
}

if (rows === 0) {
  console.error("ERRORE: nessuna riga valida: non pubblicare.");
  process.exit(1);
}

// giorni chiesti ma senza nessuna riga: tutte le camere libere, il giorno va comunque registrato
const addDays = (d, n) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const lo = cover.filter(([op]) => op === "gte" || op === "gt" || op === "eq").map(([op, v]) => (op === "gt" ? addDays(v, 1) : v));
const hi = cover.filter(([op]) => op === "lte" || op === "lt" || op === "eq").map(([op, v]) => (op === "lt" ? addDays(v, -1) : v));
for (let i = 0; i < Math.min(lo.length, hi.length); i++) for (let d = lo[i]; d <= hi[i]; d = addDays(d, 1)) days[d] ??= {};

const sorted = Object.fromEntries(Object.keys(days).sort().map((d) => [d, days[d]]));
process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), source: "La Scatola · curated_availability_daily", scatolaStatus: worst, days: sorted }, null, 1) + "\n");
const dk = Object.keys(sorted);
console.error(`RIEPILOGO: ${rows} righe, ${dk.length} giorni (${dk[0]} → ${dk.at(-1)}), stato Scatola: ${worst}`);
if (truncated) {
  console.error("ERRORE: una risposta ha ancora next_cursor: segui il cursore e rilancia.");
  process.exit(3);
}

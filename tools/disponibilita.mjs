#!/usr/bin/env node
/**
 * Costruisce disponibilita.json dalle risposte di La Scatola (vista curated_availability_daily).
 *
 * Uso:  node tools/disponibilita.mjs risposta1.json [risposta2.json ...] > disponibilita.json
 *
 * Valore per giorno e hotel = somma NETTA di free_after_options (può essere negativa = overbooking).
 * Ogni file di ingresso è la risposta grezza del connettore ({"data":[...],"freshness":{...},"page":{...}})
 * oppure un testo che la contiene. Teniamo SOLO: property_id, day, free_after_options.
 * Nessun dato ospite: la vista non ne contiene e lo script scarta tutti gli altri campi.
 * Gli ID di La Scatola / Slope sono copiati identici, mai modificati.
 */
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("uso: node tools/disponibilita.mjs risposta1.json [risposta2.json ...]");
  process.exit(2);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const RANK = { fresh: 0, ok: 0, stale: 1, failing: 2 };

/** Estrae il primo oggetto JSON con "data" da un testo (il connettore a volte lo incapsula). */
function parse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const i = text.indexOf('{"data"');
    if (i < 0) throw new Error("nessun JSON con \"data\" trovato");
    return JSON.parse(text.slice(i, text.lastIndexOf("}") + 1));
  }
}

const days = {};
const seen = new Set();
let worst = "fresh";
let rows = 0;
let truncated = false;

for (const f of files) {
  const env = parse(readFileSync(f, "utf8"));
  const list = Array.isArray(env) ? env : env.data;
  if (!Array.isArray(list)) throw new Error(`${f}: campo "data" mancante`);
  const st = env.freshness?.overall?.status;
  if (st && (RANK[st] ?? 1) > (RANK[worst] ?? 0)) worst = st;
  if (env.page?.next_cursor) truncated = true;
  for (const r of list) {
    if (!UUID.test(String(r.property_id)) || !DAY.test(String(r.day))) continue;
    const key = `${r.property_id}|${r.lodging_type_id}|${r.day}`;
    if (seen.has(key)) continue; // pagine sovrapposte: non contare due volte
    seen.add(key);
    // saldo NETTO per hotel: le camere libere di una tipologia compensano l'overbooking di un'altra
    const free = Number(r.free_after_options) || 0;
    (days[r.day] ??= {})[r.property_id] = (days[r.day][r.property_id] ?? 0) + free;
    rows++;
  }
}

if (rows === 0) {
  console.error("ERRORE: nessuna riga valida: non pubblicare.");
  process.exit(1);
}

const sorted = Object.fromEntries(Object.keys(days).sort().map((d) => [d, days[d]]));
const out = { generatedAt: new Date().toISOString(), source: "La Scatola · curated_availability_daily", scatolaStatus: worst, days: sorted };
process.stdout.write(JSON.stringify(out, null, 1) + "\n");

const dk = Object.keys(sorted);
console.error(`ok: ${rows} righe, ${dk.length} giorni (${dk[0]} → ${dk.at(-1)}), stato Scatola: ${worst}${truncated ? " — ATTENZIONE: una risposta aveva ancora next_cursor, mancano pagine" : ""}`);
if (truncated) process.exit(3);

#!/usr/bin/env node
/**
 * Stampa gli intervalli di date da chiedere a La Scatola per disponibilita.json.
 * Sono le stesse finestre pubblicate dalla piattaforma (vedi buildWindows in live.ts),
 * unite quando si toccano, limitate alle stagioni di apertura.
 * Uso: node tools/finestre.mjs   → JSON [{"from":"YYYY-MM-DD","to":"YYYY-MM-DD"}, ...]
 */
import { readFileSync } from "node:fs";

const facts = JSON.parse(readFileSync(new URL("../facts.json", import.meta.url), "utf8"));
const iso = (d) => d.toISOString().slice(0, 10);
const add = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
const y = today.getUTCFullYear();
const t = iso(today);

const inRange = (md, from, to) => (from <= to ? md >= from && md <= to : md >= from || md <= to);
const inSeason = (day) => {
  const md = day.slice(5);
  const { summer, winter } = facts.seasons;
  return inRange(md, summer.from, summer.to) || inRange(md, winter.from, winter.to);
};

const windows = [
  [t, iso(add(today, 6))],
  [`${y}-12-22`, `${y}-12-26`],
  [`${y}-12-27`, `${y + 1}-01-03`],
  [`${y + 1}-02-14`, `${y + 1}-02-21`],
  [`${y}-08-10`, `${y}-08-20`],
  [`${y + 1}-08-10`, `${y + 1}-08-20`],
];
// periodi di bassa stagione (allineati a LOW_SEASON in live.ts)
const LOW = [["12-01","12-07"],["12-08","12-14"],["12-15","12-21"],["03-01","03-07"],["03-08","03-14"],["03-15","03-21"],["03-22","03-31"],["09-01","09-15"],["09-16","09-30"],["10-01","10-15"],["10-16","10-31"]];
for (const [a, b] of LOW) { let yy = y; if (`${yy}-${b}` < t) yy++; windows.push([`${yy}-${a}`, `${yy}-${b}`]); }
const sel = windows.filter(([from, to]) => to >= t && from <= iso(add(today, 400)));

// giorni effettivamente necessari (solo notti in stagione, da oggi in poi)
const need = new Set();
for (const [from, to] of sel) {
  for (let d = new Date(from + "T00:00:00Z"); iso(d) <= to; d = add(d, 1)) {
    const day = iso(d);
    if (day >= t && inSeason(day)) need.add(day);
  }
}

// unisci i giorni consecutivi in intervalli
const days = [...need].sort();
const ranges = [];
for (const d of days) {
  const last = ranges.at(-1);
  if (last && iso(add(new Date(last.to + "T00:00:00Z"), 1)) === d) last.to = d;
  else ranges.push({ from: d, to: d });
}
process.stdout.write(JSON.stringify(ranges) + "\n");

/**
 * Build: facts.json (verificato) + La Scatola (disponibilità aggregata) → dist/
 * Uso: npm run build            → genera dist/
 *      npm run build -- --ping  → genera e avvisa IndexNow solo se i contenuti sono cambiati
 */
import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Facts, SiteModel } from "./types.js";
import { validateFacts } from "./validate.js";
import { fetchLive } from "./live.js";
import { availabilityUpdates, calendarUpdates } from "./updates.js";
import { renderAiJson, renderLlmsTxt, renderPages, renderRobots, renderRss, renderSitemap } from "./render.js";
import { pingIndexNow } from "./indexnow.js";

const ROOT = new URL(".", import.meta.url).pathname;
const DIST = join(ROOT, "dist");
const STATE = join(ROOT, ".last-hash");

async function write(rel: string, content: string): Promise<void> {
  const p = join(DIST, rel);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, content, "utf8");
}

async function main(): Promise<void> {
  const ping = process.argv.includes("--ping");
  const today = new Date();

  const facts = JSON.parse(await readFile(join(ROOT, "facts.json"), "utf8")) as Facts;
  // Indirizzo di pubblicazione: 1) variabile PUBLISH_BASE_URL (es. dominio proprio),
  // 2) ricavato dal repo GitHub (owner.github.io/repo), 3) facts.json.
  const envUrl = process.env.PUBLISH_BASE_URL?.trim();
  const ghRepo = process.env.GITHUB_REPOSITORY; // "Owner/repo", presente solo in GitHub Actions
  if (envUrl) facts.brand.publishBaseUrl = envUrl.replace(/\/$/, "");
  else if (ghRepo) {
    const [owner, repo] = ghRepo.split("/");
    if (owner && repo) facts.brand.publishBaseUrl = `https://${owner.toLowerCase()}.github.io/${repo}`;
  }
  console.log(`pubblicazione su ${facts.brand.publishBaseUrl}`);
  const v = validateFacts(facts);
  v.warnings.forEach((w) => console.warn("avviso:", w));
  if (v.errors.length) {
    v.errors.forEach((e) => console.error("ERRORE:", e));
    throw new Error(`facts.json non valido: ${v.errors.length} errori. Niente viene pubblicato.`);
  }

  const live = await fetchLive(facts, today);
  const updates = [...facts.news, ...calendarUpdates(facts, today), ...availabilityUpdates(live, facts, today)].sort((a, b) => b.date.localeCompare(a.date));

  // hash dei contenuti (senza timestamp) per capire se c'è davvero qualcosa di nuovo
  const contentHash = createHash("sha256")
    .update(JSON.stringify({ facts, windows: live.windows, updates: updates.map((u) => u.title + u.body) }))
    .digest("hex")
    .slice(0, 16);

  const model: SiteModel = { facts, live, builtAt: today.toISOString(), contentHash, updates };

  await rm(DIST, { recursive: true, force: true });
  const pages = renderPages(model);
  for (const p of pages) await write(p.path, p.html);
  await write("llms.txt", renderLlmsTxt(model, false));
  await write("llms-full.txt", renderLlmsTxt(model, true));
  await write("ai.json", renderAiJson(model));
  await write("sitemap.xml", renderSitemap(pages, model.builtAt));
  await write("feed.xml", renderRss(model));
  await write("robots.txt", renderRobots(model));
  await write(".nojekyll", "");
  // file statici extra (es. public/CNAME per il dominio proprio)
  await cp(join(ROOT, "public"), DIST, { recursive: true, force: true }).catch(() => undefined);
  // file di verifica dei motori lasciati nella radice del repo: BingSiteAuth.xml, google….html, CNAME
  for (const name of await readdir(ROOT)) {
    if (/^BingSiteAuth\.xml$|^google[0-9a-f]+\.html$|^CNAME$/i.test(name)) {
      await cp(join(ROOT, name), join(DIST, name), { force: true });
      console.log(`pubblicato file di verifica: ${name}`);
    }
  }
  const key = process.env.INDEXNOW_KEY ?? "";
  if (key) await write(`${key}.txt`, key);

  let previous = "";
  try {
    previous = (await readFile(STATE, "utf8")).trim();
  } catch {
    /* primo build */
  }
  const changed = previous !== contentHash;
  await writeFile(STATE, contentHash, "utf8");

  console.log(`build ok: ${pages.length} pagine, disponibilità=${live.freshness}, novità=${updates.length}, hash=${contentHash} (${changed ? "CAMBIATO" : "invariato"})`);

  if (ping && changed) await pingIndexNow(facts.brand.publishBaseUrl, key, pages.map((p) => p.url));
  else if (ping) console.log("indexnow: contenuti invariati → nessun ping");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

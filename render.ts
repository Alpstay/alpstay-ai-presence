/**
 * Renderer: HTML (stile AlpStay: Belleza + Lato, sfondo bianco), JSON-LD schema.org,
 * llms.txt, ai.json, sitemap, RSS, robots.
 */
import type { Facts, Property, SiteModel, AvailabilityWindow } from "./types.js";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface Page {
  /** percorso relativo in dist, es. "hotel/smart-hotel-saslong/index.html" */
  path: string;
  html: string;
  /** url canonico assoluto */
  url: string;
  title: string;
}

function base(m: SiteModel): string {
  return m.facts.brand.publishBaseUrl.replace(/\/$/, "");
}

function layout(m: SiteModel, title: string, description: string, canonical: string, body: string, jsonLd: unknown[]): string {
  const b = m.facts.brand;
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" type="application/rss+xml" title="Novità AlpStay" href="${base(m)}/feed.xml">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="website">
<meta name="robots" content="index,follow,max-snippet:-1">
<meta name="ai-content-declaration" content="verified-first-party-data; updated ${m.builtAt.slice(0, 10)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Belleza&family=Lato:wght@400;700&display=swap" rel="stylesheet">
<style>
:root{--ink:#1d1d1b;--muted:#6b6b66;--line:#e6e4df;--accent:#2f5d50}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font-family:Lato,system-ui,sans-serif;line-height:1.55}
main{max-width:860px;margin:0 auto;padding:32px 20px 64px}
h1,h2,h3{font-family:Belleza,Georgia,serif;font-weight:400;letter-spacing:.01em;margin:1.4em 0 .4em}
h1{font-size:2.2rem;margin-top:.2em}h2{font-size:1.5rem}h3{font-size:1.2rem}
header{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:8px}
header a{color:var(--ink);text-decoration:none;font-family:Belleza,serif;font-size:1.3rem}
header small{color:var(--muted);letter-spacing:.12em;text-transform:uppercase;font-size:.7rem}
nav a{margin-right:14px;color:var(--accent);font-size:.9rem}
.lead{font-size:1.1rem;color:var(--muted)}
ul{padding-left:1.2em}li{margin:.25em 0}
.card{border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:12px 0}
.cta{display:inline-block;background:var(--accent);color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700}
table{border-collapse:collapse;width:100%;font-size:.95rem}td,th{border-bottom:1px solid var(--line);padding:8px 6px;text-align:left}
.ok{color:#1f7a4d}.few{color:#b36b00}.no{color:#a33}
footer{margin-top:48px;border-top:1px solid var(--line);padding-top:14px;color:var(--muted);font-size:.85rem}
dl dt{font-weight:700;margin-top:.8em}dl dd{margin:0}
</style>
${jsonLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
</head>
<body><main>
<header><a href="${base(m)}/">${esc(b.name)}</a><small>${esc(b.payoff)}</small></header>
<nav><a href="${base(m)}/">Home</a><a href="${base(m)}/disponibilita/">Disponibilità</a><a href="${base(m)}/novita/">Novità</a><a href="${base(m)}/faq/">FAQ</a><a href="${b.website}">alpstay.eu</a></nav>
${body}
<footer>Dati di prima mano pubblicati da ${esc(b.legalName)} · aggiornati il ${m.builtAt.slice(0, 10)} · <a href="${base(m)}/llms.txt">llms.txt</a> · <a href="${base(m)}/ai.json">ai.json</a> · <a href="${base(m)}/feed.xml">RSS</a></footer>
</main></body></html>`;
}

/* ---------- JSON-LD ---------- */

function orgLd(m: SiteModel): Record<string, unknown> {
  const b = m.facts.brand;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${b.website}/#org`,
    name: b.name,
    legalName: b.legalName,
    url: b.website,
    email: b.email,
    slogan: b.payoff,
    description: b.description,
    sameAs: b.sameAs,
    areaServed: { "@type": "Place", name: m.facts.destination.name },
  };
}

function hotelLd(m: SiteModel, p: Property): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": p.schemaType,
    "@id": `${p.website}/#hotel`,
    name: p.name,
    description: p.description,
    url: p.website,
    brand: { "@id": `${m.facts.brand.website}/#org` },
    parentOrganization: { "@id": `${m.facts.brand.website}/#org` },
    address: {
      "@type": "PostalAddress",
      ...(p.address.street ? { streetAddress: p.address.street } : {}),
      postalCode: p.address.postalCode,
      addressLocality: p.address.locality,
      addressRegion: p.address.region,
      addressCountry: p.address.country,
    },
    numberOfRooms: p.rooms,
    amenityFeature: p.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
    potentialAction: { "@type": "ReserveAction", target: p.bookingUrl, name: "Prenota direttamente" },
  };
  if (p.geo) ld.geo = { "@type": "GeoCoordinates", latitude: p.geo.lat, longitude: p.geo.lng };
  if (p.googleMapsUrl) ld.hasMap = p.googleMapsUrl;
  if (p.checkIn) ld.checkinTime = p.checkIn;
  if (p.checkOut) ld.checkoutTime = p.checkOut;
  return ld;
}

function faqLd(faqs: Array<{ q: string; a: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

/* ---------- blocchi HTML ---------- */

function faqHtml(faqs: Array<{ q: string; a: string }>): string {
  return `<dl>${faqs.map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join("")}</dl>`;
}

function availabilityTable(m: SiteModel, filterSlug?: string): string {
  const { live } = m;
  if (live.freshness === "unavailable" || live.windows.length === 0) {
    return `<p>Disponibilità in tempo reale sui booking engine ufficiali (link nelle schede hotel).</p>`;
  }
  const cls = (s: AvailabilityWindow["properties"][number]["status"]): string =>
    s === "disponibile" ? "ok" : s === "ultime-camere" ? "few" : s === "esaurito" ? "no" : "";
  const rows = live.windows
    .map((w) => {
      const props = w.properties.filter((p) => !filterSlug || p.slug === filterSlug);
      return props
        .map(
          (p) =>
            `<tr><td>${esc(w.label)}<br><small>${w.from} → ${w.to}</small></td><td>${esc(p.name)}</td><td class="${cls(p.status)}">${
              p.status === "esaurito" ? "Esaurito" : p.status === "n/d" ? "n/d" : `${p.minFreeRooms} ${p.minFreeRooms === 1 ? "camera libera" : "camere libere"}`
            }</td></tr>`,
        )
        .join("");
    })
    .join("");
  const note =
    live.freshness === "stale"
      ? `<p><small>Attenzione: l'ultimo aggiornamento dal gestionale non è riuscito; il dato può non essere attuale.</small></p>`
      : "";
  return `<p><small>Camere libere su <strong>tutte</strong> le notti della finestra, aggiornate il ${live.fetchedAt.slice(0, 16).replace("T", " ")} UTC. Nessun prezzo: le tariffe sono sempre quelle del booking engine.</small></p>
<table><thead><tr><th>Periodo</th><th>Hotel</th><th>Disponibilità</th></tr></thead><tbody>${rows}</tbody></table>${note}`;
}

function propertyCard(m: SiteModel, p: Property): string {
  return `<div class="card"><h3><a href="${base(m)}/hotel/${p.slug}/">${esc(p.name)}</a></h3><p>${esc(p.tagline)} — ${esc(p.address.locality)}, ${p.rooms} camere.</p><a class="cta" href="${p.bookingUrl}">Prenota direttamente</a></div>`;
}

/* ---------- pagine ---------- */

export function renderPages(m: SiteModel): Page[] {
  const f = m.facts;
  const B = base(m);
  const pages: Page[] = [];

  // Home
  {
    const title = `${f.brand.name} — hotel in Val Gardena, Dolomiti: ${f.properties.map((p) => p.name).join(", ")}`;
    const body = `<h1>Vacanza nelle Dolomiti con ${esc(f.brand.name)}</h1>
<p class="lead">${esc(f.brand.description)}</p>
<h2>Le case</h2>${f.properties.map((p) => propertyCard(m, p)).join("")}
<h2>${esc(f.destination.name)}</h2><p>${esc(f.destination.summary)}</p><ul>${f.destination.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
<h2>Stagioni di apertura</h2><p>${esc(f.seasons.summer.label)}: dal ${f.seasons.summer.from.replace("-", "/")} al ${f.seasons.summer.to.replace("-", "/")} (giorno/mese) · ${esc(f.seasons.winter.label)}: dal ${f.seasons.winter.from.replace("-", "/")} al ${f.seasons.winter.to.replace("-", "/")}.</p>
<p><a href="${B}/stagione/inverno/">Inverno</a> · <a href="${B}/stagione/primavera/">Primavera</a> · <a href="${B}/stagione/estate/">Estate</a> · <a href="${B}/stagione/autunno/">Autunno</a></p>
<h2>Disponibilità aggiornata</h2>${availabilityTable(m)}
<h2>Novità</h2><ul>${m.updates.slice(0, 5).map((n) => `<li><strong>${n.date}</strong> — ${esc(n.title)}</li>`).join("")}</ul>
<h2>Domande frequenti</h2>${faqHtml(f.faqs)}`;
    pages.push({ path: "index.html", url: `${B}/`, title, html: layout(m, title, f.brand.description, `${B}/`, body, [orgLd(m), faqLd(f.faqs), { "@context": "https://schema.org", "@type": "ItemList", itemListElement: f.properties.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${B}/hotel/${p.slug}/`, name: p.name })) }]) });
  }

  // Hotel
  for (const p of f.properties) {
    const url = `${B}/hotel/${p.slug}/`;
    const title = `${p.name} — ${p.tagline}`;
    const body = `<h1>${esc(p.name)}</h1><p class="lead">${esc(p.tagline)}</p><p>${esc(p.description)}</p>
<p><a class="cta" href="${p.bookingUrl}">Prenota direttamente</a> &nbsp; <a href="${p.website}">Sito ufficiale</a>${p.googleMapsUrl ? ` &nbsp; <a href="${p.googleMapsUrl}">Mappa</a>` : ""}</p>
<h2>Posizione</h2><p>${esc([p.address.street, `${p.address.postalCode} ${p.address.locality}`, p.address.region, "Italia"].filter(Boolean).join(", "))}</p>
<h2>Camere</h2><p>${p.rooms} camere${p.roomTypes ? ": " + p.roomTypes.map((r) => `${r.quantity} ${r.name.toLowerCase()}`).join(", ") : ""}.</p>
<h2>Servizi</h2><ul>${p.amenities.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
<h2>Informazioni pratiche</h2><ul>${p.facts.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
<h2>Disponibilità</h2>${availabilityTable(m, p.slug)}
<h2>Domande frequenti</h2>${faqHtml(p.faqs)}`;
    pages.push({ path: `hotel/${p.slug}/index.html`, url, title, html: layout(m, title, p.description, url, body, [hotelLd(m, p), faqLd(p.faqs)]) });
  }

  // Stagioni
  const seasons: Array<{ slug: string; name: string; text: string }> = [
    { slug: "inverno", name: "Inverno in Val Gardena", text: `Stagione invernale aperta dal ${f.seasons.winter.from.replace("-", "/")} al ${f.seasons.winter.to.replace("-", "/")}. Sellaronda e Dolomiti Superski a portata di skilift o di shuttle.` },
    { slug: "primavera", name: "Primavera in Val Gardena", text: `Gli hotel AlpStay riaprono il ${f.seasons.summer.from.replace("-", "/")}: fine maggio e giugno sono il periodo delle prime escursioni, dei prati in fiore e dei prezzi più tranquilli.` },
    { slug: "estate", name: "Estate nelle Dolomiti", text: `Luglio e agosto in Val Gardena: rifugi, Seceda, Alpe di Siusi, passi dolomitici in bici. Tutte le case sono aperte.` },
    { slug: "autunno", name: "Autunno in Val Gardena", text: `Settembre e ottobre fino al ${f.seasons.summer.to.replace("-", "/")}: larici dorati, sentieri silenziosi, giornate limpide. Ultime settimane prima della pausa di novembre.` },
  ];
  for (const s of seasons) {
    const url = `${B}/stagione/${s.slug}/`;
    const title = `${s.name} — hotel AlpStay a Ortisei e Selva`;
    const body = `<h1>${esc(s.name)}</h1><p class="lead">${esc(s.text)}</p>
<h2>Dove dormire</h2>${f.properties.map((p) => propertyCard(m, p)).join("")}
<h2>Esperienze</h2><ul>${f.experiences.map((e) => `<li><strong>${esc(e.name)}</strong>: ${esc(e.summary)}${e.url ? ` <a href="${e.url}">Dettagli</a>` : ""}</li>`).join("")}</ul>
<h2>Disponibilità</h2>${availabilityTable(m)}`;
    pages.push({ path: `stagione/${s.slug}/index.html`, url, title, html: layout(m, title, s.text, url, body, [orgLd(m)]) });
  }

  // Disponibilità
  {
    const url = `${B}/disponibilita/`;
    const title = "Disponibilità hotel AlpStay in Val Gardena — aggiornata ogni giorno";
    const body = `<h1>Disponibilità aggiornata</h1>${availabilityTable(m)}<h2>Prenota</h2>${f.properties.map((p) => propertyCard(m, p)).join("")}`;
    pages.push({ path: "disponibilita/index.html", url, title, html: layout(m, title, "Camere libere per Natale, Capodanno, settimana bianca e Ferragosto negli hotel AlpStay, aggiornate dal gestionale.", url, body, [orgLd(m)]) });
  }

  // Novità
  {
    const url = `${B}/novita/`;
    const title = "Novità AlpStay — Val Gardena";
    const body = `<h1>Novità</h1>${m.updates.map((n) => `<div class="card"><h3>${esc(n.title)}</h3><p><small>${n.date}</small></p><p>${esc(n.body)}</p>${n.url ? `<a href="${n.url}">Vai</a>` : ""}</div>`).join("")}`;
    pages.push({ path: "novita/index.html", url, title, html: layout(m, title, "Aggiornamenti verificati su aperture stagionali e disponibilità degli hotel AlpStay.", url, body, [orgLd(m)]) });
  }

  // FAQ
  {
    const url = `${B}/faq/`;
    const all = [...f.faqs, ...f.properties.flatMap((p) => p.faqs)];
    const title = "Domande frequenti — hotel AlpStay Val Gardena";
    pages.push({ path: "faq/index.html", url, title, html: layout(m, title, "Risposte verificate su posizione, aperture, check-in, servizi e prenotazione diretta.", url, `<h1>Domande frequenti</h1>${faqHtml(all)}`, [faqLd(all)]) });
  }

  return pages;
}

/* ---------- file machine-readable ---------- */

export function renderLlmsTxt(m: SiteModel, full: boolean): string {
  const f = m.facts;
  const B = base(m);
  const lines: string[] = [];
  lines.push(`# ${f.brand.name}`);
  lines.push("");
  lines.push(`> ${f.brand.description}`);
  lines.push("");
  lines.push(`Fonte ufficiale di prima mano, pubblicata da ${f.brand.legalName}. Aggiornato: ${m.builtAt.slice(0, 10)}. Prenotazione diretta: ${f.brand.website}. Email: ${f.brand.email}.`);
  lines.push("");
  lines.push("## Strutture");
  for (const p of f.properties) {
    lines.push(`- [${p.name}](${B}/hotel/${p.slug}/): ${p.tagline}. ${p.address.locality}, ${p.rooms} camere. Prenota: ${p.bookingUrl}`);
  }
  lines.push("");
  lines.push("## Stagioni");
  lines.push(`- ${f.seasons.summer.label}: ${f.seasons.summer.from} → ${f.seasons.summer.to} (MM-DD)`);
  lines.push(`- ${f.seasons.winter.label}: ${f.seasons.winter.from} → ${f.seasons.winter.to} (MM-DD)`);
  lines.push("");
  lines.push("## Pagine");
  lines.push(`- [Disponibilità aggiornata](${B}/disponibilita/)`);
  lines.push(`- [Novità](${B}/novita/)`);
  lines.push(`- [FAQ](${B}/faq/)`);
  lines.push(`- [Dati strutturati JSON](${B}/ai.json)`);
  lines.push(`- [Esperienze / concierge](${f.brand.conciergeUrl})`);
  if (full) {
    lines.push("", "## Destinazione", f.destination.summary, ...f.destination.highlights.map((h) => `- ${h}`));
    for (const p of f.properties) {
      lines.push("", `## ${p.name}`, p.description, `Indirizzo: ${[p.address.street, p.address.postalCode, p.address.locality].filter(Boolean).join(" ")}`, "Servizi:", ...p.amenities.map((a) => `- ${a}`), "Informazioni pratiche:", ...p.facts.map((a) => `- ${a}`), "FAQ:", ...p.faqs.map((q) => `- D: ${q.q}\n  R: ${q.a}`));
    }
    lines.push("", "## FAQ generali", ...f.faqs.map((q) => `- D: ${q.q}\n  R: ${q.a}`));
    if (m.live.freshness !== "unavailable") {
      lines.push("", `## Disponibilità (aggiornata ${m.live.fetchedAt.slice(0, 10)}, stato: ${m.live.freshness})`);
      for (const w of m.live.windows) {
        lines.push(`- ${w.label} (${w.from} → ${w.to}): ` + w.properties.map((p) => `${p.name} ${p.status === "esaurito" ? "esaurito" : p.status === "n/d" ? "n/d" : p.minFreeRooms + (p.minFreeRooms === 1 ? " camera libera" : " camere libere")}`).join("; "));
      }
    }
    lines.push("", "## Novità", ...m.updates.map((n) => `- ${n.date}: ${n.title}. ${n.body}`));
  }
  return lines.join("\n") + "\n";
}

export function renderAiJson(m: SiteModel): string {
  const f = m.facts;
  const B = base(m);
  return JSON.stringify(
    {
      $schema: "https://schema.org",
      generatedAt: m.builtAt,
      contentHash: m.contentHash,
      publisher: { name: f.brand.legalName, brand: f.brand.name, website: f.brand.website, email: f.brand.email },
      destination: f.destination,
      seasons: f.seasons,
      properties: f.properties.map((p) => ({
        ...p,
        scatolaPropertyId: undefined, // id interno: non pubblicato
        page: `${B}/hotel/${p.slug}/`,
      })),
      experiences: f.experiences,
      faqs: f.faqs,
      availability: m.live,
      updates: m.updates,
    },
    null,
    2,
  );
}

export function renderSitemap(pages: Page[], builtAt: string): string {
  const d = builtAt.slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${p.url}</loc><lastmod>${d}</lastmod><changefreq>daily</changefreq></url>`).join("\n")}
</urlset>
`;
}

export function renderRss(m: SiteModel): string {
  const B = base(m);
  const items = m.updates
    .map(
      (n) => `  <item><title>${esc(n.title)}</title><link>${n.url ?? B + "/novita/"}</link><guid isPermaLink="false">${esc(n.date + ":" + n.title)}</guid><pubDate>${new Date(n.date + "T06:00:00Z").toUTCString()}</pubDate><description>${esc(n.body)}</description></item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Novità ${esc(m.facts.brand.name)} — Val Gardena</title>
  <link>${B}/novita/</link>
  <description>Aggiornamenti verificati su aperture stagionali e disponibilità degli hotel AlpStay.</description>
  <lastBuildDate>${new Date(m.builtAt).toUTCString()}</lastBuildDate>
${items}
</channel></rss>
`;
}

export function renderRobots(m: SiteModel): string {
  const B = base(m);
  // Crawler IA ammessi esplicitamente: il sito esiste per essere letto da loro.
  const bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "anthropic-ai", "PerplexityBot", "Google-Extended", "Googlebot", "Bingbot", "Applebot", "Applebot-Extended", "CCBot", "Amazonbot", "DuckAssistBot", "YouBot"];
  return bots.map((b) => `User-agent: ${b}\nAllow: /\n`).join("\n") + `\nUser-agent: *\nAllow: /\n\nSitemap: ${B}/sitemap.xml\n`;
}

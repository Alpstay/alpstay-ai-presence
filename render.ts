/**
 * Renderer: HTML (stile AlpStay: Belleza + Lato, sfondo bianco), JSON-LD schema.org,
 * llms.txt, ai.json, sitemap, RSS, robots.
 */
import type { Property, SiteModel, AvailabilityWindow } from "./types.js";

/* ---------- lingue: percorsi e testi fissi ---------- */

type SeasonKey = "inverno" | "primavera" | "estate" | "autunno";
interface Routes {
  home: string;
  hotel: string;
  avail: string;
  updates: string | null;
  faq: string;
  season: string;
  seasons: Record<SeasonKey, string>;
}
const ROUTES: Record<"it" | "de", Routes> = {
  it: { home: "", hotel: "hotel", avail: "disponibilita", updates: "aggiornamenti-hotel-val-gardena", faq: "faq", season: "stagione", seasons: { inverno: "inverno", primavera: "primavera", estate: "estate", autunno: "autunno" } },
  de: { home: "de", hotel: "de/hotel", avail: "de/verfuegbarkeit", updates: null, faq: "de/faq", season: "de/saison", seasons: { inverno: "winter", primavera: "fruehling", estate: "sommer", autunno: "herbst" } },
};
export const LANGS: Array<"it" | "de"> = ["it", "de"];
const dir = (r: string): string => (r ? `${r}/` : "");
const rel = (r: string): string => `${dir(r)}index.html`;

const MESI: Record<"it" | "de", string[]> = {
  it: ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"],
  de: ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
};
/** "05-15" → "15 maggio" / "15. Mai" */
const giorno = (md: string, lang: "it" | "de" = "it"): string => {
  const [mm, dd] = md.split("-");
  const mese = MESI[lang][Number(mm) - 1] ?? mm;
  return lang === "de" ? `${Number(dd)}. ${mese}` : `${Number(dd)} ${mese}`;
};

/** Etichetta della finestra di disponibilità nella lingua della pagina (la chiave viene da live.ts). */
function windowLabel(w: AvailabilityWindow, lang: "it" | "de"): string {
  if (lang === "it") return w.label;
  const y = (w.key.match(/(\d{4})$/) ?? [])[1] ?? "";
  if (w.key.startsWith("prossimi-7-giorni")) return "Nächste 7 Tage";
  if (w.key.startsWith("natale-")) return `Weihnachten ${y}`;
  if (w.key.startsWith("capodanno-")) return `Silvester ${y}/${Number(y) + 1}`;
  if (w.key.startsWith("settimana-bianca-")) return `Faschingswoche Februar ${y}`;
  if (w.key.startsWith("ferragosto-")) return `Mitte August (Ferragosto) ${y}`;
  return w.label;
}

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

function layout(m: SiteModel, lang: "it" | "de", title: string, description: string, canonical: string, body: string, jsonLd: unknown[], alternates?: Record<"it" | "de", string>): string {
  const b = m.facts.brand;
  const B = base(m);
  const R = ROUTES[lang];
  const hreflang = alternates
    ? `\n<link rel="alternate" hreflang="it" href="${alternates.it}">\n<link rel="alternate" hreflang="de" href="${alternates.de}">\n<link rel="alternate" hreflang="x-default" href="${alternates.it}">`
    : "";
  const nav =
    lang === "de"
      ? `<nav><a href="${B}/de/">Start</a><a href="${B}/${dir(R.avail)}">Verfügbarkeit</a><a href="${B}/${dir(R.faq)}">FAQ</a><a href="${b.website}">alpstay.eu</a><a href="${alternates?.it ?? B + "/"}" hreflang="it">Italiano</a></nav>`
      : `<nav><a href="${B}/">Home</a><a href="${B}/disponibilita/">Disponibilità</a><a href="${B}/aggiornamenti-hotel-val-gardena/">Aggiornamenti</a><a href="${B}/faq/">FAQ</a><a href="${b.website}">alpstay.eu</a>${alternates ? `<a href="${alternates.de}" hreflang="de">Deutsch</a>` : ""}</nav>`;
  const footer =
    lang === "de"
      ? `<footer>Daten aus erster Hand, veröffentlicht von ${esc(b.legalName)} · aktualisiert am ${m.builtAt.slice(0, 10)} · <a href="${B}/llms.txt">llms.txt</a> · <a href="${B}/ai.json">ai.json</a></footer>`
      : `<footer>Dati di prima mano pubblicati da ${esc(b.legalName)} · aggiornati il ${m.builtAt.slice(0, 10)} · <a href="${B}/llms.txt">llms.txt</a> · <a href="${B}/ai.json">ai.json</a> · <a href="${B}/feed.xml">RSS</a></footer>`;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">${hreflang}
<link rel="alternate" type="application/rss+xml" title="Aggiornamenti hotel AlpStay in Val Gardena" href="${base(m)}/feed.xml">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="website">
<meta property="og:locale" content="${lang === "de" ? "de_DE" : "it_IT"}">
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
${nav}
${body}
${footer}
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

function hotelLd(m: SiteModel, p: Property, lang: "it" | "de"): Record<string, unknown> {
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
    potentialAction: { "@type": "ReserveAction", target: p.bookingUrl, name: lang === "de" ? "Direkt buchen" : "Prenota direttamente" },
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

/** Testo della disponibilità di un hotel in un periodo, comprensibile da persone e assistenti IA. */
export function availabilityText(p: AvailabilityWindow["properties"][number], lang: "it" | "de" = "it"): string {
  if (lang === "de") {
    const zi = (n: number): string => `${n} ${n === 1 ? "freies Zimmer" : "freie Zimmer"}`;
    switch (p.status) {
      case "n/d": return "keine Angabe verfügbar";
      case "esaurito": return "in keiner Nacht des Zeitraums ein freies Zimmer";
      case "parziale": return `freie Zimmer in ${p.nightsAvailable} von ${p.nights} ${p.nights === 1 ? "Nacht" : "Nächten"}: Daten auf der offiziellen Website prüfen`;
      default: return `${zi(p.minFreeRooms)} für alle ${p.nights} Nächte des Zeitraums`;
    }
  }
  const cam = (n: number): string => `${n} ${n === 1 ? "camera libera" : "camere libere"}`;
  switch (p.status) {
    case "n/d": return "dato non disponibile";
    case "esaurito": return "nessuna camera libera in nessuna notte del periodo";
    case "parziale": return `camere libere in ${p.nightsAvailable} ${p.nightsAvailable === 1 ? "notte" : "notti"} su ${p.nights}: verificare le date sul sito ufficiale`;
    default: return `${cam(p.minFreeRooms)} per tutte le ${p.nights} notti del periodo`;
  }
}

/* ---------- blocchi HTML ---------- */

function faqHtml(faqs: Array<{ q: string; a: string }>): string {
  return `<dl>${faqs.map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join("")}</dl>`;
}

function availabilityTable(m: SiteModel, lang: "it" | "de", filterSlug?: string): string {
  const { live } = m;
  if (live.freshness === "unavailable" || live.windows.length === 0) {
    if (lang === "de") return `<p>Echtzeit-Verfügbarkeit in den offiziellen Buchungsmaschinen (Links auf den Hotelseiten).</p>`;
    return `<p>Disponibilità in tempo reale sui booking engine ufficiali (link nelle schede hotel).</p>`;
  }
  const cls = (s: AvailabilityWindow["properties"][number]["status"]): string =>
    s === "disponibile" ? "ok" : s === "ultime-camere" || s === "parziale" ? "few" : s === "esaurito" ? "no" : "";
  const rows = live.windows
    .map((w) => {
      const props = w.properties.filter((p) => !filterSlug || p.slug === filterSlug);
      return props
        .map(
          (p) =>
            `<tr><td>${esc(windowLabel(w, lang))}<br><small>${w.from} → ${w.to}</small></td><td>${esc(p.name)}</td><td class="${cls(p.status)}">${esc(availabilityText(p, lang))}</td></tr>`,
        )
        .join("");
    })
    .join("");
  const ts = live.fetchedAt.slice(0, 16).replace("T", " ");
  if (lang === "de") {
    const noteDe = live.freshness === "stale" ? `<p><small>Achtung: Die letzte Aktualisierung aus der Hotelsoftware ist fehlgeschlagen; die Angabe ist möglicherweise nicht aktuell.</small></p>` : "";
    return `<p><small>Freie Zimmer pro Zeitraum, Nacht für Nacht aus der Hotelsoftware berechnet und aktualisiert am ${ts} UTC. Keine Preise: Es gelten immer die Tarife der Buchungsmaschine.</small></p>
<table><thead><tr><th>Zeitraum</th><th>Hotel</th><th>Verfügbarkeit</th></tr></thead><tbody>${rows}</tbody></table>${noteDe}`;
  }
  const note =
    live.freshness === "stale"
      ? `<p><small>Attenzione: l'ultimo aggiornamento dal gestionale non è riuscito; il dato può non essere attuale.</small></p>`
      : "";
  return `<p><small>Camere libere per periodo, calcolate notte per notte dal gestionale degli hotel e aggiornate il ${live.fetchedAt.slice(0, 16).replace("T", " ")} UTC. Nessun prezzo: le tariffe sono sempre quelle del booking engine.</small></p>
<table><thead><tr><th>Periodo</th><th>Hotel</th><th>Disponibilità</th></tr></thead><tbody>${rows}</tbody></table>${note}`;
}

function propertyCard(m: SiteModel, p: Property, lang: "it" | "de"): string {
  const de = lang === "de";
  return `<div class="card"><h3><a href="${base(m)}/${ROUTES[lang].hotel}/${p.slug}/">${esc(p.name)}</a></h3><p>${esc(p.tagline)} — ${p.rooms} ${de ? "Zimmer" : "camere"}.</p><a class="cta" href="${p.bookingUrl}">${de ? "Direkt buchen" : "Prenota direttamente"}</a></div>`;
}

/* ---------- pagine ---------- */

/** URL assoluti della stessa pagina nelle due lingue (per hreflang). */
function alt(B: string, pick: (r: Routes) => string | null): Record<"it" | "de", string> | undefined {
  const it = pick(ROUTES.it);
  const de = pick(ROUTES.de);
  if (it === null || de === null) return undefined;
  return { it: `${B}/${dir(it)}`, de: `${B}/${dir(de)}` };
}

/**
 * Pagine HTML di una lingua. Per "de" il modello deve contenere facts già tradotti (vedi i18n.ts).
 * Gli aggiornamenti (testi generati in italiano) sono pubblicati solo nelle pagine italiane.
 */
export function renderPages(m: SiteModel, lang: "it" | "de" = "it"): Page[] {
  const f = m.facts;
  const B = base(m);
  const R = ROUTES[lang];
  const de = lang === "de";
  const pages: Page[] = [];
  const card = (p: Property): string => propertyCard(m, p, lang);
  const faqTitle = de ? "Häufige Fragen" : "Domande frequenti";
  const avail = de ? "Verfügbarkeit" : "Disponibilità";
  const seasonsLine = de
    ? `${esc(f.seasons.summer.label)}: vom ${giorno(f.seasons.summer.from, lang)} bis ${giorno(f.seasons.summer.to, lang)} · ${esc(f.seasons.winter.label)}: vom ${giorno(f.seasons.winter.from, lang)} bis ${giorno(f.seasons.winter.to, lang)}.`
    : `${esc(f.seasons.summer.label)}: dal ${giorno(f.seasons.summer.from)} al ${giorno(f.seasons.summer.to)} · ${esc(f.seasons.winter.label)}: dal ${giorno(f.seasons.winter.from)} al ${giorno(f.seasons.winter.to)}.`;
  const seasonNames: Record<SeasonKey, string> = de
    ? { inverno: "Winter", primavera: "Frühling", estate: "Sommer", autunno: "Herbst" }
    : { inverno: "Inverno", primavera: "Primavera", estate: "Estate", autunno: "Autunno" };
  const seasonOrder: SeasonKey[] = ["inverno", "primavera", "estate", "autunno"];

  // Home
  {
    const url = `${B}/${dir(R.home)}`;
    const title = de
      ? `${f.brand.name} — Hotels im Grödnertal, Dolomiten: ${f.properties.map((p) => p.name).join(", ")}`
      : `${f.brand.name} — hotel in Val Gardena, Dolomiti: ${f.properties.map((p) => p.name).join(", ")}`;
    const updatesBlock = de ? "" : `\n<h2>Aggiornamenti dagli hotel</h2><ul>${m.updates.slice(0, 5).map((n) => `<li><strong>${n.date}</strong> — ${esc(n.title)}</li>`).join("")}</ul>`;
    const body = `<h1>${de ? `Urlaub in den Dolomiten mit ${esc(f.brand.name)}` : `Vacanza nelle Dolomiti con ${esc(f.brand.name)}`}</h1>
<p class="lead">${esc(f.brand.description)}</p>
<h2>${de ? "Die Häuser" : "Le case"}</h2>${f.properties.map(card).join("")}
<h2>${esc(f.destination.name)}</h2><p>${esc(f.destination.summary)}</p><ul>${f.destination.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
<h2>${de ? "Öffnungszeiten" : "Stagioni di apertura"}</h2><p>${seasonsLine}</p>
<p>${seasonOrder.map((k) => `<a href="${B}/${R.season}/${R.seasons[k]}/">${seasonNames[k]}</a>`).join(" · ")}</p>
<h2>${de ? "Aktuelle Verfügbarkeit" : "Disponibilità aggiornata"}</h2>${availabilityTable(m, lang)}${updatesBlock}
<h2>${faqTitle}</h2>${faqHtml(f.faqs)}`;
    const list = { "@context": "https://schema.org", "@type": "ItemList", itemListElement: f.properties.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${B}/${R.hotel}/${p.slug}/`, name: p.name })) };
    pages.push({ path: rel(R.home), url, title, html: layout(m, lang, title, f.brand.description, url, body, [orgLd(m), faqLd(f.faqs), list], alt(B, (r) => r.home)) });
  }

  // Hotel
  for (const p of f.properties) {
    const url = `${B}/${R.hotel}/${p.slug}/`;
    const title = `${p.name} — ${p.tagline}`;
    const country = de ? "Italien" : "Italia";
    const rooms = `${p.rooms} ${de ? "Zimmer" : "camere"}${p.roomTypes ? ": " + p.roomTypes.map((r) => `${r.quantity} ${de ? r.name : r.name.toLowerCase()}`).join(", ") : ""}.`;
    const body = `<h1>${esc(p.name)}</h1><p class="lead">${esc(p.tagline)}</p><p>${esc(p.description)}</p>
<p><a class="cta" href="${p.bookingUrl}">${de ? "Direkt buchen" : "Prenota direttamente"}</a> &nbsp; <a href="${p.website}">${de ? "Offizielle Website" : "Sito ufficiale"}</a>${p.googleMapsUrl ? ` &nbsp; <a href="${p.googleMapsUrl}">${de ? "Karte" : "Mappa"}</a>` : ""}</p>
<h2>${de ? "Lage" : "Posizione"}</h2><p>${esc([p.address.street, `${p.address.postalCode} ${p.address.locality}`, de ? "Südtirol" : p.address.region, country].filter(Boolean).join(", "))}</p>
<h2>${de ? "Zimmer" : "Camere"}</h2><p>${esc(rooms)}</p>
<h2>${de ? "Ausstattung" : "Servizi"}</h2><ul>${p.amenities.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
<h2>${de ? "Praktische Informationen" : "Informazioni pratiche"}</h2><ul>${p.facts.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
<h2>${avail}</h2>${availabilityTable(m, lang, p.slug)}
<h2>${faqTitle}</h2>${faqHtml(p.faqs)}`;
    pages.push({ path: `${R.hotel}/${p.slug}/index.html`, url, title, html: layout(m, lang, title, p.description, url, body, [hotelLd(m, p, lang), faqLd(p.faqs)], alt(B, (r) => `${r.hotel}/${p.slug}`)) });
  }

  // Stagioni
  const seasonText: Record<SeasonKey, { name: string; text: string }> = de
    ? {
        inverno: { name: "Winter im Grödnertal", text: `Wintersaison vom ${giorno(f.seasons.winter.from, lang)} bis ${giorno(f.seasons.winter.to, lang)}. Sellaronda und Dolomiti Superski direkt per Skilift oder mit dem Shuttle erreichbar.` },
        primavera: { name: "Frühling im Grödnertal", text: `Die AlpStay-Hotels öffnen wieder am ${giorno(f.seasons.summer.from, lang)}: Ende Mai und Juni ist die Zeit der ersten Wanderungen, der blühenden Wiesen und der ruhigeren Preise.` },
        estate: { name: "Sommer in den Dolomiten", text: "Juli und August im Grödnertal: Hütten, Seceda, Seiser Alm, Dolomitenpässe mit dem Rad. Alle Häuser sind geöffnet." },
        autunno: { name: "Herbst im Grödnertal", text: `September und Oktober bis zum ${giorno(f.seasons.summer.to, lang)}: goldene Lärchen, ruhige Wege, klare Tage. Die letzten Wochen vor der Novemberpause.` },
      }
    : {
        inverno: { name: "Inverno in Val Gardena", text: `Stagione invernale aperta dal ${giorno(f.seasons.winter.from)} al ${giorno(f.seasons.winter.to)}. Sellaronda e Dolomiti Superski a portata di skilift o di shuttle.` },
        primavera: { name: "Primavera in Val Gardena", text: `Gli hotel AlpStay riaprono il ${giorno(f.seasons.summer.from)}: fine maggio e giugno sono il periodo delle prime escursioni, dei prati in fiore e dei prezzi più tranquilli.` },
        estate: { name: "Estate nelle Dolomiti", text: `Luglio e agosto in Val Gardena: rifugi, Seceda, Alpe di Siusi, passi dolomitici in bici. Tutte le case sono aperte.` },
        autunno: { name: "Autunno in Val Gardena", text: `Settembre e ottobre fino al ${giorno(f.seasons.summer.to)}: larici dorati, sentieri silenziosi, giornate limpide. Ultime settimane prima della pausa di novembre.` },
      };
  for (const k of seasonOrder) {
    const s = seasonText[k];
    const url = `${B}/${R.season}/${R.seasons[k]}/`;
    const title = de ? `${s.name} — AlpStay-Hotels in St. Ulrich, St. Christina und Wolkenstein` : `${s.name} — hotel AlpStay a Ortisei, Santa Cristina e Selva`;
    const body = `<h1>${esc(s.name)}</h1><p class="lead">${esc(s.text)}</p>
<h2>${de ? "Unterkünfte" : "Dove dormire"}</h2>${f.properties.map(card).join("")}
<h2>${de ? "Erlebnisse" : "Esperienze"}</h2><ul>${f.experiences.map((e) => `<li><strong>${esc(e.name)}</strong>: ${esc(e.summary)}${e.url ? ` <a href="${e.url}">${de ? "Details" : "Dettagli"}</a>` : ""}</li>`).join("")}</ul>
<h2>${avail}</h2>${availabilityTable(m, lang)}`;
    pages.push({ path: `${R.season}/${R.seasons[k]}/index.html`, url, title, html: layout(m, lang, title, s.text, url, body, [orgLd(m)], alt(B, (r) => `${r.season}/${r.seasons[k]}`)) });
  }

  // Disponibilità
  {
    const url = `${B}/${dir(R.avail)}`;
    const title = de ? "Verfügbarkeit der AlpStay-Hotels im Grödnertal — täglich aktualisiert" : "Disponibilità hotel AlpStay in Val Gardena — aggiornata ogni giorno";
    const desc = de
      ? "Freie Zimmer für Weihnachten, Silvester, Faschingswoche und Mitte August in den AlpStay-Hotels, aus der Hotelsoftware aktualisiert."
      : "Camere libere per Natale, Capodanno, settimana bianca e Ferragosto negli hotel AlpStay, aggiornate dal gestionale.";
    const body = `<h1>${de ? "Aktuelle Verfügbarkeit" : "Disponibilità aggiornata"}</h1>${availabilityTable(m, lang)}<h2>${de ? "Buchen" : "Prenota"}</h2>${f.properties.map(card).join("")}`;
    pages.push({ path: rel(R.avail), url, title, html: layout(m, lang, title, desc, url, body, [orgLd(m)], alt(B, (r) => r.avail)) });
  }

  // Novità (solo italiano)
  if (R.updates) {
    const url = `${B}/${dir(R.updates)}`;
    const title = "Aggiornamenti hotel AlpStay in Val Gardena: aperture e camere libere";
    const body = `<h1>Aggiornamenti dagli hotel AlpStay in Val Gardena</h1><p class="lead">Aperture stagionali e camere libere di Smart Hotel Saslong, Chalet Hotel Hartmann e Hotel Acadia, aggiornate dal gestionale degli hotel.</p>${m.updates.map((n) => `<div class="card"><h3>${esc(n.title)}</h3><p><small>${n.date}</small></p><p>${esc(n.body)}</p>${n.url ? `<a href="${n.url}">Vai</a>` : ""}</div>`).join("")}`;
    pages.push({ path: rel(R.updates), url, title, html: layout(m, lang, title, "Aggiornamenti verificati su aperture stagionali e disponibilità degli hotel AlpStay.", url, body, [orgLd(m)]) });
  }

  // FAQ
  {
    const url = `${B}/${dir(R.faq)}`;
    const all = [...f.faqs, ...f.properties.flatMap((p) => p.faqs)];
    const title = de ? "Häufige Fragen — AlpStay-Hotels im Grödnertal" : "Domande frequenti — hotel AlpStay Val Gardena";
    const desc = de
      ? "Geprüfte Antworten zu Lage, Öffnungszeiten, Check-in, Ausstattung und Direktbuchung."
      : "Risposte verificate su posizione, aperture, check-in, servizi e prenotazione diretta.";
    pages.push({ path: rel(R.faq), url, title, html: layout(m, lang, title, desc, url, `<h1>${faqTitle}</h1>${faqHtml(all)}`, [faqLd(all)], alt(B, (r) => r.faq)) });
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
  lines.push(`- ${f.seasons.summer.label}: dal ${giorno(f.seasons.summer.from)} al ${giorno(f.seasons.summer.to)}`);
  lines.push(`- ${f.seasons.winter.label}: dal ${giorno(f.seasons.winter.from)} al ${giorno(f.seasons.winter.to)}`);
  lines.push("");
  lines.push("## Pagine");
  lines.push(`- [Disponibilità aggiornata](${B}/disponibilita/)`);
  lines.push(`- [Aggiornamenti dagli hotel](${B}/aggiornamenti-hotel-val-gardena/)`);
  lines.push(`- [FAQ](${B}/faq/)`);
  lines.push(`- [Dati strutturati JSON](${B}/ai.json)`);
  lines.push(`- [Esperienze / concierge](${f.brand.conciergeUrl})`);
  lines.push("");
  lines.push("## Deutsch");
  lines.push(`- [AlpStay-Hotels im Grödnertal (Startseite)](${B}/de/)`);
  for (const p of f.properties) lines.push(`- [${p.name}](${B}/${ROUTES.de.hotel}/${p.slug}/)`);
  lines.push(`- [Verfügbarkeit](${B}/${dir(ROUTES.de.avail)})`);
  lines.push(`- [Häufige Fragen](${B}/${dir(ROUTES.de.faq)})`);
  if (full) {
    lines.push("", "## Destinazione", f.destination.summary, ...f.destination.highlights.map((h) => `- ${h}`));
    for (const p of f.properties) {
      lines.push("", `## ${p.name}`, p.description, `Indirizzo: ${[p.address.street, p.address.postalCode, p.address.locality].filter(Boolean).join(" ")}`, "Servizi:", ...p.amenities.map((a) => `- ${a}`), "Informazioni pratiche:", ...p.facts.map((a) => `- ${a}`), "FAQ:", ...p.faqs.map((q) => `- D: ${q.q}\n  R: ${q.a}`));
    }
    lines.push("", "## FAQ generali", ...f.faqs.map((q) => `- D: ${q.q}\n  R: ${q.a}`));
    if (m.live.freshness !== "unavailable") {
      lines.push("", `## Disponibilità (aggiornata ${m.live.fetchedAt.slice(0, 10)}, stato: ${m.live.freshness})`);
      for (const w of m.live.windows) {
        lines.push(`- ${w.label} (${w.from} → ${w.to}): ` + w.properties.map((p) => `${p.name}: ${availabilityText(p)}`).join("; "));
      }
    }
    lines.push("", "## Aggiornamenti dagli hotel", ...m.updates.map((n) => `- ${n.date}: ${n.title}. ${n.body}`));
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
      (n) => `  <item><title>${esc(n.title)}</title><link>${n.url ?? B + "/aggiornamenti-hotel-val-gardena/"}</link><guid isPermaLink="false">${esc(n.date + ":" + n.title)}</guid><pubDate>${new Date(n.date + "T06:00:00Z").toUTCString()}</pubDate><description>${esc(n.body)}</description></item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Aggiornamenti hotel ${esc(m.facts.brand.name)} in Val Gardena</title>
  <link>${B}/aggiornamenti-hotel-val-gardena/</link>
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

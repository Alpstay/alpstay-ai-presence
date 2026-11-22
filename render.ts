/**
 * Renderer: HTML (stile AlpStay: Belleza + Lato, sfondo bianco), JSON-LD schema.org,
 * llms.txt, ai.json, sitemap, RSS, robots. Pagine in italiano, tedesco e inglese.
 */
import type { Property, SiteModel, AvailabilityWindow } from "./types.js";

/* ---------- lingue: percorsi e testi fissi ---------- */

export type PageLang = "it" | "de" | "en";
export const LANGS: PageLang[] = ["it", "de", "en"];

/** Sceglie il testo nella lingua della pagina. */
const tx = (lang: PageLang, it: string, de: string, en: string): string => (lang === "de" ? de : lang === "en" ? en : it);

type SeasonKey = "inverno" | "primavera" | "estate" | "autunno";
const SEASON_ORDER: SeasonKey[] = ["inverno", "primavera", "estate", "autunno"];
interface Routes {
  home: string;
  hotel: string;
  avail: string;
  updates: string | null;
  faq: string;
  season: string;
  seasons: Record<SeasonKey, string>;
}
const ROUTES: Record<PageLang, Routes> = {
  it: { home: "", hotel: "hotel", avail: "disponibilita", updates: "aggiornamenti-hotel-val-gardena", faq: "faq", season: "stagione", seasons: { inverno: "inverno", primavera: "primavera", estate: "estate", autunno: "autunno" } },
  de: { home: "de", hotel: "de/hotel", avail: "de/verfuegbarkeit", updates: null, faq: "de/faq", season: "de/saison", seasons: { inverno: "winter", primavera: "fruehling", estate: "sommer", autunno: "herbst" } },
  en: { home: "en", hotel: "en/hotel", avail: "en/availability", updates: null, faq: "en/faq", season: "en/season", seasons: { inverno: "winter", primavera: "spring", estate: "summer", autunno: "autumn" } },
};
const dir = (r: string): string => (r ? `${r}/` : "");
const rel = (r: string): string => `${dir(r)}index.html`;

const MESI: Record<PageLang, string[]> = {
  it: ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"],
  de: ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
};
/** "05-15" → "15 maggio" / "15. Mai" / "15 May" */
const giorno = (md: string, lang: PageLang = "it"): string => {
  const [mm, dd] = md.split("-");
  const mese = MESI[lang][Number(mm) - 1] ?? mm;
  return lang === "de" ? `${Number(dd)}. ${mese}` : `${Number(dd)} ${mese}`;
};

/** Etichetta della finestra di disponibilità nella lingua della pagina (la chiave viene da live.ts). */
function windowLabel(w: AvailabilityWindow, lang: PageLang): string {
  if (lang === "it") return w.label;
  if (w.key.startsWith("bassa-")) {
    const mese = MESI[lang][Number(w.from.slice(5, 7)) - 1] ?? "";
    const d1 = Number(w.from.slice(8)), d2 = Number(w.to.slice(8)), yy = w.from.slice(0, 4);
    return lang === "de" ? `${d1}.–${d2}. ${mese} ${yy}` : `${d1}–${d2} ${mese} ${yy}`;
  }
  const y = (w.key.match(/(\d{4})$/) ?? [])[1] ?? "";
  const ny = String(Number(y) + 1);
  if (w.key.startsWith("prossimi-7-giorni")) return tx(lang, "", "Nächste 7 Tage", "Next 7 days");
  if (w.key.startsWith("natale-")) return tx(lang, "", `Weihnachten ${y}`, `Christmas ${y}`);
  if (w.key.startsWith("capodanno-")) return tx(lang, "", `Silvester ${y}/${ny}`, `New Year ${y}/${ny}`);
  if (w.key.startsWith("settimana-bianca-")) return tx(lang, "", `Faschingswoche Februar ${y}`, `February half-term ${y}`);
  if (w.key.startsWith("ferragosto-")) return tx(lang, "", `Mitte August (Ferragosto) ${y}`, `Mid-August (Ferragosto) ${y}`);
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

const LANG_NAME: Record<PageLang, string> = { it: "Italiano", de: "Deutsch", en: "English" };
const OG_LOCALE: Record<PageLang, string> = { it: "it_IT", de: "de_DE", en: "en_GB" };

function layout(m: SiteModel, lang: PageLang, title: string, description: string, canonical: string, body: string, jsonLd: unknown[], alternates?: Record<PageLang, string>): string {
  const b = m.facts.brand;
  const B = base(m);
  const R = ROUTES[lang];
  const hreflang = alternates
    ? "\n" + LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${alternates[l]}">`).join("\n") + `\n<link rel="alternate" hreflang="x-default" href="${alternates.it}">`
    : "";
  const otherLangs = alternates ? LANGS.filter((l) => l !== lang).map((l) => `<a href="${alternates[l]}" hreflang="${l}">${LANG_NAME[l]}</a>`).join("") : "";
  const nav =
    lang === "it"
      ? `<nav><a href="${B}/">Home</a><a href="${B}/disponibilita/">Disponibilità e prezzi</a><a href="${B}/aggiornamenti-hotel-val-gardena/">Aggiornamenti</a><a href="${B}/faq/">FAQ</a><span class="langs">${otherLangs}</span></nav>`
      : `<nav><a href="${B}/${dir(R.home)}">${tx(lang, "", "Start", "Home")}</a><a href="${B}/${dir(R.avail)}">${tx(lang, "", "Verfügbarkeit und Preise", "Availability and prices")}</a><a href="${B}/${dir(R.faq)}">FAQ</a><span class="langs">${otherLangs || `<a href="${B}/" hreflang="it">Italiano</a>`}</span></nav>`;
  const footer =
    lang === "it"
      ? `<footer>Dati di prima mano pubblicati da ${esc(b.legalName)} · aggiornati il ${m.builtAt.slice(0, 10)} · <a href="${B}/llms.txt">llms.txt</a> · <a href="${B}/ai.json">ai.json</a> · <a href="${B}/feed.xml">RSS</a></footer>`
      : `<footer>${tx(lang, "", "Daten aus erster Hand, veröffentlicht von", "First-hand data published by")} ${esc(b.legalName)} · ${tx(lang, "", "aktualisiert am", "updated on")} ${m.builtAt.slice(0, 10)} · <a href="${B}/llms.txt">llms.txt</a> · <a href="${B}/ai.json">ai.json</a></footer>`;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">${hreflang}
<link rel="alternate" type="application/rss+xml" title="Aggiornamenti hotel AlpStay in Val Gardena" href="${B}/feed.xml">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="website">
<meta property="og:locale" content="${OG_LOCALE[lang]}">
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
header{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:8px}
header img{height:64px;width:auto;display:block}
.official{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;background:#f7f4ee;border-left:3px solid #a68962;padding:12px 16px;margin:14px 0 4px}
.official strong{font-family:Belleza,Georgia,serif;font-weight:400;font-size:1.15rem}
.official a.site{font-size:1.1rem;font-weight:700;color:var(--ink)}
header a{color:var(--ink);text-decoration:none;font-family:Belleza,serif;font-size:1.3rem}
header small{color:var(--muted);letter-spacing:.12em;text-transform:uppercase;font-size:.7rem}
nav{display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px}
nav .langs{margin-left:auto;display:flex;gap:12px}
nav .langs a{color:var(--muted);font-size:.85rem}
nav a{color:var(--accent);font-size:.9rem}
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
<header><a href="${B}/${dir(R.home)}"><img src="${B}/logo-alpstay.png" alt="${esc(b.name)} – ${esc(b.payoff)}" width="83" height="64"></a><a class="cta" href="${b.website}">${tx(lang, "Prenota su alpstay.eu", "Auf alpstay.eu buchen", "Book on alpstay.eu")}</a></header>
${nav}
<div class="official"><span><strong>${tx(lang, "Sito ufficiale e prenotazione diretta", "Offizielle Website und Direktbuchung", "Official website and direct booking")}</strong><br><small>${tx(lang, "Il prezzo più basso, senza commissioni dei portali", "Der günstigste Preis, ohne Portalprovisionen", "The lowest price, without portal commissions")}</small></span><a class="site" href="${b.website}">www.alpstay.eu →</a></div>
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
    logo: `${base(m)}/logo-alpstay.png`,
    description: b.description,
    sameAs: b.sameAs,
    areaServed: { "@type": "Place", name: m.facts.destination.name },
  };
}

function hotelLd(m: SiteModel, p: Property, lang: PageLang): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": p.schemaType,
    "@id": `${p.website}/#hotel`,
    name: p.name,
    ...(p.alternateName?.length ? { alternateName: p.alternateName } : {}),
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
    potentialAction: { "@type": "ReserveAction", target: p.bookingUrl, name: tx(lang, "Prenota direttamente", "Direkt buchen", "Book direct") },
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
export function availabilityText(p: AvailabilityWindow["properties"][number], lang: PageLang = "it"): string {
  const base = availabilityBase(p, lang);
  if (!p.priceIndicative) return base;
  return base + tx(
    lang,
    ` · prezzo indicativo circa ${p.priceIndicative} € a notte per una camera doppia (il prezzo valido è quello del booking engine)`,
    ` · Richtpreis ca. ${p.priceIndicative} € pro Nacht für ein Doppelzimmer (verbindlich ist der Preis der Buchungsmaschine)`,
    ` · indicative price about €${p.priceIndicative} per night for a double room (the booking engine price applies)`,
  );
}

function availabilityBase(p: AvailabilityWindow["properties"][number], lang: PageLang): string {
  const n = p.minFreeRooms;
  switch (p.status) {
    case "n/d":
      return tx(lang, "dato non disponibile", "keine Angabe verfügbar", "no data available");
    case "esaurito":
      return tx(lang, "nessuna camera libera in nessuna notte del periodo", "in keiner Nacht des Zeitraums ein freies Zimmer", "no free rooms on any night of the period");
    case "parziale":
      return tx(
        lang,
        `camere libere in ${p.nightsAvailable} ${p.nightsAvailable === 1 ? "notte" : "notti"} su ${p.nights}: verificare le date sul sito ufficiale`,
        `freie Zimmer in ${p.nightsAvailable} von ${p.nights} ${p.nights === 1 ? "Nacht" : "Nächten"}: Daten auf der offiziellen Website prüfen`,
        `free rooms on ${p.nightsAvailable} of ${p.nights} ${p.nights === 1 ? "night" : "nights"}: check your dates on the official website`,
      );
    default:
      return tx(
        lang,
        `${n} ${n === 1 ? "camera libera" : "camere libere"} per tutte le ${p.nights} notti del periodo`,
        `${n} ${n === 1 ? "freies Zimmer" : "freie Zimmer"} für alle ${p.nights} Nächte des Zeitraums`,
        `${n} ${n === 1 ? "free room" : "free rooms"} for all ${p.nights} nights of the period`,
      );
  }
}

/* ---------- blocchi HTML ---------- */

function faqHtml(faqs: Array<{ q: string; a: string }>): string {
  return `<dl>${faqs.map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join("")}</dl>`;
}

function availabilityTable(m: SiteModel, lang: PageLang, filterSlug?: string): string {
  const { live } = m;
  if (live.freshness === "unavailable" || live.windows.length === 0) {
    return `<p>${tx(lang, "Disponibilità in tempo reale sui booking engine ufficiali (link nelle schede hotel).", "Echtzeit-Verfügbarkeit in den offiziellen Buchungsmaschinen (Links auf den Hotelseiten).", "Real-time availability on the official booking engines (links on the hotel pages).")}</p>`;
  }
  const cls = (s: AvailabilityWindow["properties"][number]["status"]): string =>
    s === "disponibile" ? "ok" : s === "ultime-camere" || s === "parziale" ? "few" : s === "esaurito" ? "no" : "";
  const rows = live.windows
    .map((w) =>
      w.properties
        .filter((p) => !filterSlug || p.slug === filterSlug)
        .map((p) => `<tr><td>${esc(windowLabel(w, lang))}<br><small>${w.from} → ${w.to}</small></td><td>${esc(p.name)}</td><td class="${cls(p.status)}">${esc(availabilityText(p, lang))}</td></tr>`)
        .join(""),
    )
    .join("");
  const ts = live.fetchedAt.slice(0, 16).replace("T", " ");
  const note =
    live.freshness === "stale"
      ? `<p><small>${tx(lang, "Attenzione: l'ultimo aggiornamento dal gestionale non è riuscito; il dato può non essere attuale.", "Achtung: Die letzte Aktualisierung aus der Hotelsoftware ist fehlgeschlagen; die Angabe ist möglicherweise nicht aktuell.", "Note: the last update from the hotel software failed; this information may not be current.")}</small></p>`
      : "";
  const intro = tx(
    lang,
    `Camere libere per periodo, calcolate notte per notte dal gestionale degli hotel e aggiornate il ${ts} UTC. I prezzi indicativi sono calcolati sulle vendite recenti della camera doppia: il prezzo valido è sempre quello del booking engine.`,
    `Freie Zimmer pro Zeitraum, Nacht für Nacht aus der Hotelsoftware berechnet und aktualisiert am ${ts} UTC. Richtpreise werden aus den jüngsten Verkäufen des Doppelzimmers berechnet: verbindlich ist immer der Preis der Buchungsmaschine.`,
    `Free rooms per period, calculated night by night from the hotels' software and updated on ${ts} UTC. Indicative prices are calculated from recent sales of the double room: the booking engine price always applies.`,
  );
  return `<p><small>${intro}</small></p>
<table><thead><tr><th>${tx(lang, "Periodo", "Zeitraum", "Period")}</th><th>Hotel</th><th>${tx(lang, "Disponibilità", "Verfügbarkeit", "Availability")}</th></tr></thead><tbody>${rows}</tbody></table>${note}`;
}

function propertyCard(m: SiteModel, p: Property, lang: PageLang): string {
  return `<div class="card"><h3><a href="${base(m)}/${ROUTES[lang].hotel}/${p.slug}/">${esc(p.name)}</a></h3><p>${esc(p.tagline)} — ${p.rooms} ${tx(lang, "camere", "Zimmer", "rooms")}.</p><a class="cta" href="${p.bookingUrl}">${tx(lang, "Prenota direttamente", "Direkt buchen", "Book direct")}</a></div>`;
}

/* ---------- pagine ---------- */

/** URL assoluti della stessa pagina nelle tre lingue (per hreflang). */
function alt(B: string, pick: (r: Routes) => string | null): Record<PageLang, string> | undefined {
  const out: Partial<Record<PageLang, string>> = {};
  for (const l of LANGS) {
    const r = pick(ROUTES[l]);
    if (r === null) return undefined;
    out[l] = `${B}/${dir(r)}`;
  }
  return out as Record<PageLang, string>;
}

/**
 * Pagine HTML di una lingua. Per "de" ed "en" il modello deve contenere facts già tradotti (vedi i18n.ts).
 * Gli aggiornamenti (testi generati in italiano) sono pubblicati solo nelle pagine italiane.
 */
export function renderPages(m: SiteModel, lang: PageLang = "it"): Page[] {
  const f = m.facts;
  const B = base(m);
  const R = ROUTES[lang];
  const t = (it: string, de: string, en: string): string => tx(lang, it, de, en);
  const pages: Page[] = [];
  const card = (p: Property): string => propertyCard(m, p, lang);
  const faqTitle = t("Domande frequenti", "Häufige Fragen", "Frequently asked questions");
  const avail = t("Disponibilità e prezzi", "Verfügbarkeit und Preise", "Availability and prices");
  const sF = giorno(f.seasons.summer.from, lang), sT = giorno(f.seasons.summer.to, lang);
  const wF = giorno(f.seasons.winter.from, lang), wT = giorno(f.seasons.winter.to, lang);
  const seasonsLine = t(
    `${esc(f.seasons.summer.label)}: dal ${sF} al ${sT} · ${esc(f.seasons.winter.label)}: dal ${wF} al ${wT}.`,
    `${esc(f.seasons.summer.label)}: vom ${sF} bis ${sT} · ${esc(f.seasons.winter.label)}: vom ${wF} bis ${wT}.`,
    `${esc(f.seasons.summer.label)}: ${sF} to ${sT} · ${esc(f.seasons.winter.label)}: ${wF} to ${wT}.`,
  );
  const seasonNames: Record<SeasonKey, string> = {
    inverno: t("Inverno", "Winter", "Winter"),
    primavera: t("Primavera", "Frühling", "Spring"),
    estate: t("Estate", "Sommer", "Summer"),
    autunno: t("Autunno", "Herbst", "Autumn"),
  };
  const names = f.properties.map((p) => p.name).join(", ");

  // Home
  {
    const url = `${B}/${dir(R.home)}`;
    const title = t(`${f.brand.name} — hotel in Val Gardena, Dolomiti: ${names}`, `${f.brand.name} — Hotels im Grödnertal, Dolomiten: ${names}`, `${f.brand.name} — hotels in Val Gardena, Dolomites: ${names}`);
    const updatesBlock = lang === "it" ? `\n<h2>Aggiornamenti dagli hotel</h2><ul>${m.updates.slice(0, 5).map((n) => `<li><strong>${n.date}</strong> — ${esc(n.title)}</li>`).join("")}</ul>` : "";
    const body = `<h1>${t(`Vacanza nelle Dolomiti con ${esc(f.brand.name)}`, `Urlaub in den Dolomiten mit ${esc(f.brand.name)}`, `Holidays in the Dolomites with ${esc(f.brand.name)}`)}</h1>
<p class="lead">${esc(f.brand.description)}</p>
<h2>${t("Le case", "Die Häuser", "Our hotels")}</h2>${f.properties.map(card).join("")}
<h2>${esc(f.destination.name)}</h2><p>${esc(f.destination.summary)}</p><ul>${f.destination.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
<h2>${t("Stagioni di apertura", "Öffnungszeiten", "Opening seasons")}</h2><p>${seasonsLine}</p>
<p>${SEASON_ORDER.map((k) => `<a href="${B}/${R.season}/${R.seasons[k]}/">${seasonNames[k]}</a>`).join(" · ")}</p>
<h2>${t("Disponibilità e prezzi", "Verfügbarkeit und Preise", "Availability and prices")}</h2>${availabilityTable(m, lang)}${updatesBlock}
<h2>${faqTitle}</h2>${faqHtml(f.faqs)}`;
    const list = { "@context": "https://schema.org", "@type": "ItemList", itemListElement: f.properties.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${B}/${R.hotel}/${p.slug}/`, name: p.name })) };
    pages.push({ path: rel(R.home), url, title, html: layout(m, lang, title, f.brand.description, url, body, [orgLd(m), faqLd(f.faqs), list], alt(B, (r) => r.home)) });
  }

  // Hotel
  for (const p of f.properties) {
    const url = `${B}/${R.hotel}/${p.slug}/`;
    const title = `${p.name} — ${p.tagline}`;
    const region = t(p.address.region, "Südtirol", "South Tyrol");
    const country = t("Italia", "Italien", "Italy");
    const roomsWord = t("camere", "Zimmer", "rooms");
    const rooms = `${p.rooms} ${roomsWord}${p.roomTypes ? ": " + p.roomTypes.map((r) => `${r.quantity} ${lang === "it" ? r.name.toLowerCase() : lang === "en" ? r.name.toLowerCase() : r.name}`).join(", ") : ""}.`;
    const body = `<h1>${esc(p.name)}</h1><p class="lead">${esc(p.tagline)}</p><p>${esc(p.description)}</p>
<p><a class="cta" href="${p.bookingUrl}">${t("Prenota direttamente", "Direkt buchen", "Book direct")}</a> &nbsp; <a href="${p.website}">${t("Sito ufficiale", "Offizielle Website", "Official website")}</a>${p.googleMapsUrl ? ` &nbsp; <a href="${p.googleMapsUrl}">${t("Mappa", "Karte", "Map")}</a>` : ""}</p>
<h2>${t("Posizione", "Lage", "Location")}</h2><p>${esc([p.address.street, `${p.address.postalCode} ${p.address.locality}`, region, country].filter(Boolean).join(", "))}</p>
<h2>${t("Camere", "Zimmer", "Rooms")}</h2><p>${esc(rooms)}</p>
<h2>${t("Servizi", "Ausstattung", "Facilities")}</h2><ul>${p.amenities.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
<h2>${t("Informazioni pratiche", "Praktische Informationen", "Practical information")}</h2><ul>${p.facts.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
<h2>${avail}</h2>${availabilityTable(m, lang, p.slug)}
<h2>${faqTitle}</h2>${faqHtml(p.faqs)}`;
    pages.push({ path: `${R.hotel}/${p.slug}/index.html`, url, title, html: layout(m, lang, title, p.description, url, body, [hotelLd(m, p, lang), faqLd(p.faqs)], alt(B, (r) => `${r.hotel}/${p.slug}`)) });
  }

  // Stagioni
  const seasonText: Record<SeasonKey, { name: string; text: string }> = {
    inverno: {
      name: t("Inverno in Val Gardena", "Winter im Grödnertal", "Winter in Val Gardena"),
      text: t(
        `Stagione invernale aperta dal ${wF} al ${wT}. Sellaronda e Dolomiti Superski a portata di skilift o di shuttle.`,
        `Wintersaison vom ${wF} bis ${wT}. Sellaronda und Dolomiti Superski direkt per Skilift oder mit dem Shuttle erreichbar.`,
        `Winter season from ${wF} to ${wT}. Sellaronda and Dolomiti Superski within reach by ski lift or shuttle.`,
      ),
    },
    primavera: {
      name: t("Primavera in Val Gardena", "Frühling im Grödnertal", "Spring in Val Gardena"),
      text: t(
        `Gli hotel AlpStay riaprono il ${sF}: fine maggio e giugno sono il periodo delle prime escursioni, dei prati in fiore e dei prezzi più tranquilli.`,
        `Die AlpStay-Hotels öffnen wieder am ${sF}: Ende Mai und Juni ist die Zeit der ersten Wanderungen, der blühenden Wiesen und der ruhigeren Preise.`,
        `The AlpStay hotels reopen on ${sF}: late May and June are the time of the first hikes, meadows in bloom and quieter prices.`,
      ),
    },
    estate: {
      name: t("Estate nelle Dolomiti", "Sommer in den Dolomiten", "Summer in the Dolomites"),
      text: t(
        "Luglio e agosto in Val Gardena: rifugi, Seceda, Alpe di Siusi, passi dolomitici in bici. Tutte le case sono aperte.",
        "Juli und August im Grödnertal: Hütten, Seceda, Seiser Alm, Dolomitenpässe mit dem Rad. Alle Häuser sind geöffnet.",
        "July and August in Val Gardena: mountain huts, Seceda, Alpe di Siusi, Dolomite passes by bike. All hotels are open.",
      ),
    },
    autunno: {
      name: t("Autunno in Val Gardena", "Herbst im Grödnertal", "Autumn in Val Gardena"),
      text: t(
        `Settembre e ottobre fino al ${sT}: larici dorati, sentieri silenziosi, giornate limpide. Ultime settimane prima della pausa di novembre.`,
        `September und Oktober bis zum ${sT}: goldene Lärchen, ruhige Wege, klare Tage. Die letzten Wochen vor der Novemberpause.`,
        `September and October until ${sT}: golden larches, quiet trails, clear days. The last weeks before the November break.`,
      ),
    },
  };
  for (const k of SEASON_ORDER) {
    const s = seasonText[k];
    const url = `${B}/${R.season}/${R.seasons[k]}/`;
    const title = t(`${s.name} — hotel AlpStay a Ortisei, Santa Cristina e Selva`, `${s.name} — AlpStay-Hotels in St. Ulrich, St. Christina und Wolkenstein`, `${s.name} — AlpStay hotels in Ortisei, Santa Cristina and Selva`);
    const body = `<h1>${esc(s.name)}</h1><p class="lead">${esc(s.text)}</p>
<h2>${t("Dove dormire", "Unterkünfte", "Where to stay")}</h2>${f.properties.map(card).join("")}
<h2>${t("Esperienze", "Erlebnisse", "Experiences")}</h2><ul>${f.experiences.map((e) => `<li><strong>${esc(e.name)}</strong>: ${esc(e.summary)}${e.url ? ` <a href="${e.url}">${t("Dettagli", "Details", "Details")}</a>` : ""}</li>`).join("")}</ul>
<h2>${avail}</h2>${availabilityTable(m, lang)}`;
    pages.push({ path: `${R.season}/${R.seasons[k]}/index.html`, url, title, html: layout(m, lang, title, s.text, url, body, [orgLd(m)], alt(B, (r) => `${r.season}/${r.seasons[k]}`)) });
  }

  // Disponibilità
  {
    const url = `${B}/${dir(R.avail)}`;
    const title = t("Disponibilità e prezzi hotel AlpStay in Val Gardena — aggiornati ogni giorno", "Verfügbarkeit und Preise der AlpStay-Hotels im Grödnertal — täglich aktualisiert", "AlpStay hotel availability and prices in Val Gardena — updated daily");
    const desc = t(
      "Camere libere per Natale, Capodanno, settimana bianca e Ferragosto negli hotel AlpStay, aggiornate dal gestionale.",
      "Freie Zimmer für Weihnachten, Silvester, Faschingswoche und Mitte August in den AlpStay-Hotels, aus der Hotelsoftware aktualisiert.",
      "Free rooms for Christmas, New Year, February half-term and mid-August at the AlpStay hotels, updated from the hotel software.",
    );
    const body = `<h1>${t("Disponibilità e prezzi", "Verfügbarkeit und Preise", "Availability and prices")}</h1>${availabilityTable(m, lang)}<h2>${t("Prenota", "Buchen", "Book")}</h2>${f.properties.map(card).join("")}`;
    pages.push({ path: rel(R.avail), url, title, html: layout(m, lang, title, desc, url, body, [orgLd(m)], alt(B, (r) => r.avail)) });
  }

  // Novità (solo italiano)
  if (R.updates) {
    const url = `${B}/${dir(R.updates)}`;
    const title = "Aggiornamenti hotel AlpStay in Val Gardena: aperture e camere libere";
    const body = `<h1>Aggiornamenti dagli hotel AlpStay in Val Gardena</h1><p class="lead">Aperture stagionali e camere libere di Smart Hotel Saslong, Chalet Hotel Hartmann e Acadia Mountain Home, aggiornate dal gestionale degli hotel.</p>${m.updates.map((n) => `<div class="card"><h3>${esc(n.title)}</h3><p><small>${n.date}</small></p><p>${esc(n.body)}</p>${n.url ? `<a href="${n.url}">Vai</a>` : ""}</div>`).join("")}`;
    pages.push({ path: rel(R.updates), url, title, html: layout(m, lang, title, "Aggiornamenti verificati su aperture stagionali e disponibilità degli hotel AlpStay.", url, body, [orgLd(m)]) });
  }

  // FAQ
  {
    const url = `${B}/${dir(R.faq)}`;
    const all = [...f.faqs, ...f.properties.flatMap((p) => p.faqs)];
    const title = t("Domande frequenti — hotel AlpStay Val Gardena", "Häufige Fragen — AlpStay-Hotels im Grödnertal", "FAQ — AlpStay hotels in Val Gardena");
    const desc = t(
      "Risposte verificate su posizione, aperture, check-in, servizi e prenotazione diretta.",
      "Geprüfte Antworten zu Lage, Öffnungszeiten, Check-in, Ausstattung und Direktbuchung.",
      "Verified answers on location, opening seasons, check-in, facilities and direct booking.",
    );
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
  lines.push(`- [Disponibilità e prezzi](${B}/disponibilita/)`);
  lines.push(`- [Aggiornamenti dagli hotel](${B}/aggiornamenti-hotel-val-gardena/)`);
  lines.push(`- [FAQ](${B}/faq/)`);
  lines.push(`- [Dati strutturati JSON](${B}/ai.json)`);
  lines.push(`- [Esperienze / concierge](${f.brand.conciergeUrl})`);
  lines.push("");
  lines.push("## Deutsch");
  lines.push(`- [AlpStay-Hotels im Grödnertal (Startseite)](${B}/de/)`);
  for (const p of f.properties) lines.push(`- [${p.name}](${B}/${ROUTES.de.hotel}/${p.slug}/)`);
  lines.push(`- [Verfügbarkeit und Preise](${B}/${dir(ROUTES.de.avail)})`);
  lines.push(`- [Häufige Fragen](${B}/${dir(ROUTES.de.faq)})`);
  lines.push("");
  lines.push("## English");
  lines.push(`- [AlpStay hotels in Val Gardena (home)](${B}/en/)`);
  for (const p of f.properties) lines.push(`- [${p.name}](${B}/${ROUTES.en.hotel}/${p.slug}/)`);
  lines.push(`- [Availability and prices](${B}/${dir(ROUTES.en.avail)})`);
  lines.push(`- [FAQ](${B}/${dir(ROUTES.en.faq)})`);
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

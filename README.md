# AlpStay AI Presence

Sito statico, rigenerato 3 volte al giorno, che pubblica **solo fatti verificati** su AlpStay
(Smart Hotel Saslong, Chalet Hotel Hartmann, Hotel Acadia — Val Gardena) nei formati che i
motori di ricerca e gli assistenti IA leggono davvero:

| File | A cosa serve |
|---|---|
| `index.html`, `hotel/<slug>/`, `stagione/<stagione>/`, `faq/`, `disponibilita/`, `novita/` | Pagine HTML con JSON-LD schema.org (`Organization`, `Hotel`, `FAQPage`, `ReserveAction`) |
| `llms.txt`, `llms-full.txt` | Riassunto e versione completa per i crawler IA (ChatGPT, Claude, Perplexity…) |
| `ai.json` | Tutti i dati in JSON, con disponibilità e novità |
| `sitemap.xml`, `feed.xml`, `robots.txt` | Indicizzazione Google/Bing + RSS delle novità; i bot IA sono ammessi esplicitamente |

**Da dove vengono i dati**

- `facts.json` — fatti dichiarati e verificati dall'azienda. È l'unico file da curare.
- La Scatola (vista `curated_availability_daily`, senza dati personali) — camere libere per
  finestra: prossimi 7 giorni, Natale, Capodanno, settimana bianca, Ferragosto. Mai prezzi,
  mai prenotazioni, mai ospiti. Se la Scatola non risponde il sito esce comunque, senza la
  sezione disponibilità.
- Calendario — "apertura stagione tra N giorni", "ultime notti prima della chiusura":
  novità vere, generate ogni giorno senza scrivere niente.

Il build **fallisce** se `facts.json` contiene campi vuoti obbligatori, segnaposto (TODO, TBD),
URL non https o conteggi camere incoerenti: niente di incompleto va online.
Gli ID di Slope/Scatola non vengono mai modificati né pubblicati.

## Messa online in 5 passi

1. **Crea il repository** su GitHub (pubblico) chiamato `alpstay-ai-presence` e carica
   questa cartella (`git push` oppure "Upload files" dal browser).
2. **Settings → Pages → Source: GitHub Actions.** Nessun'altra configurazione.
3. **Settings → Secrets and variables → Actions → New repository secret**, tre volte:
   - `INDEXNOW_KEY` — una stringa a piacere di 32 caratteri (lettere e numeri), es. generata su
     https://www.bing.com/indexnow/getstarted
   - `DATABOX_URL` — l'URL del gateway della Scatola (es. `https://…/`, quello con `/api/v1`)
   - `DATABOX_TOKEN` — un bearer di sola lettura registrato per questa app
     (vedi il runbook della Scatola: serve un client con grant sulle 3 strutture).
     Senza questi due secret il sito funziona lo stesso, senza disponibilità.
4. **Actions → "Pubblica AlpStay AI Presence" → Run workflow.** Dopo ~1 minuto il sito è su
   `https://alpstay.github.io/alpstay-ai-presence-/`. L'indirizzo viene ricavato automaticamente dal nome del repo; quando passi a un dominio proprio imposta la variabile `PUBLISH_BASE_URL` (Settings → Secrets and variables → Actions → Variables).
5. **Fatti trovare**: in Bing Webmaster Tools e Google Search Console aggiungi la proprietà e
   invia `…/sitemap.xml`. Da quel momento ogni build invia a IndexNow solo le pagine che sono
   cambiate davvero (hash dei contenuti), così nessun motore vede "rumore".

Poi, quando vuoi portarlo su dominio proprio: crea il record DNS `ai.alpstay.eu` → GitHub Pages,
aggiungi il file `public/CNAME` con `ai.alpstay.eu` e cambia `publishBaseUrl`. Nel frattempo
collega il sito da alpstay.eu con un link in footer ("Dati per assistenti IA") e un
`<link rel="alternate" type="application/rss+xml">`: il segnale di appartenenza al brand conta.

## Lavoro quotidiano (zero per lo staff)

Il workflow gira da solo. L'unica azione umana è aggiornare `facts.json` quando cambia
un fatto (nuovo servizio, orario, apertura): il push ricostruisce e ripubblica.
Per una notizia una tantum aggiungi una voce in `news`:

```json
{ "date": "2026-11-20", "title": "Nuova sauna allo Chalet Hartmann", "body": "…", "url": "https://www.hotel-hartmann.com" }
```

## In locale

```bash
npm install
npm run build          # genera dist/
npm run preview        # http://localhost:8080
DATABOX_URL=… DATABOX_TOKEN=… npm run build   # con disponibilità live
```

## Struttura

```
facts.json      fatti verificati (unica fonte curata a mano)
types.ts         tipi
validate.ts      controlli bloccanti sui fatti
live.ts          disponibilità aggregata da La Scatola
updates.ts       novità da calendario e disponibilità
render.ts        HTML + JSON-LD + llms.txt + ai.json + sitemap + RSS + robots
indexnow.ts      notifica ai motori
build.ts         orchestrazione
```

## Come misurare se funziona

- Bing Webmaster Tools / Search Console: impression delle pagine `hotel/*` e `disponibilita/`.
- Ogni 2 settimane chiedi a ChatGPT, Copilot, Perplexity e Claude: "hotel con self check-in a
  Ortisei", "hotel sulla Sellaronda a Selva", "c'è posto in Val Gardena a Capodanno?" e annota se
  AlpStay viene citata e con quale link. Il connettore Ubersuggest/OpenRush può automatizzare
  questo controllo (brand visibility / AI citations).

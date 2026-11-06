# Attività pianificata: report di performance (notifica)

Da creare come attività pianificata di Claude: Europe/Rome, ogni giorno alle 7:20, notifica push attiva,
con il testo qui sotto come istruzione.

---

Prepara il report di performance quotidiano di AlpStay (tre hotel in Val Gardena) per il direct booking e la
visibilità sulle IA. Lavori senza nessuno che risponda: non fare domande. Il riepilogo finale arriva come
notifica sul telefono: massimo 8 righe, si deve leggere in 10 secondi. Non scrivi nulla da nessuna parte.

REGOLE SUI NUMERI
- Ogni numero viene da La Scatola, da GitHub o da OpenRush. Se un dato manca scrivi «dato non disponibile»,
  mai una stima. Ogni calcolo con uno script Python, mai a mente.
- Solo dati aggregati: nessun nome di ospite, nessun importo per singola prenotazione.
- Non modificare mai gli ID ricevuti da Slope/La Scatola.
- Strutture (property_id identici): Acadia 11111111-1111-4111-8111-111111111111 · Hartmann
  22222222-2222-4222-8222-222222222222 · Saslong 33333333-3333-4333-8333-333333333333.
- G = oggi nel fuso Europe/Rome, I = ieri (G-1). Gli strumenti di La Scatola e di OpenRush, se mancano,
  si caricano con ToolSearch.

OGNI GIORNO
1. Freschezza: mcp__La_Scatola__get_freshness. Se è "failing" scrivilo nella prima riga.
2. Prenotazioni create ieri: mcp__La_Scatola__query_curated_view, view "curated_reservations",
   filters creation_date gte I, creation_date lt G; group_by ["property_id","channel_bucket","booking_status"];
   aggregates [{"field":"reservation_id","op":"count"},{"field":"room_nights","op":"sum"},
   {"field":"room_amount","op":"sum"}]; limit 500 (se page.next_cursor non è nullo, seguilo).
   Conta solo booking_status CONFIRMED come nuove; le CANCELLED a parte.
   Per gruppo e per hotel: diretto = bucket direct, portali = ota, google = metasearch, altro = unclassified.
   Quota diretta = 100 × notti dirette / notti totali (1 decimale).
3. Cancellazioni di ieri: stessa vista con filters cancellation_date gte I, cancellation_date lt G,
   group_by ["channel_bucket"], aggregates count di reservation_id e sum di room_nights.
4. Piattaforma IA: collega con add_repo (owner "Alpstay", repo "alpstay-ai-presence", access "read") e
   clona. `git log -1 --format=%cd --date=iso origin/main -- disponibilita.json` = ultimo aggiornamento delle
   camere libere; se è più vecchio di 30 ore segnalalo. `git log --since="26 hours ago" --oneline origin/main`
   conta i commit "chore: aggiorna hash build" (= ricostruzioni con contenuto nuovo).

SOLO IL LUNEDÌ (in aggiunta)
5. Visibilità IA: mcp__OpenRush__inspect_ai_visibility con domain "alpstay.eu", location "Italy", language
   "Italian" (solo, senza competitor): mentions e last_cited_at. Poi la stessa chiamata con competitors
   ["booking.com","suedtirol.info","valgardena.it","alpstay.github.io"]: quota di alpstay.eu.
6. Ricerca Google: mcp__OpenRush__inspect_domain con domain "alpstay.eu", location "Italy", language "Italian":
   organic_keywords, top_10_keywords, estimated_organic_traffic_per_month.
   Ricorda che coprono solo Google (AI Overview e ricerca), non ChatGPT né Copilot.

RIEPILOGO (è la notifica: niente intestazioni né tabelle, massimo 8 righe, italiano)
- Riga 1: «Ieri <gg/mm>: <n> nuove prenotazioni, <x> dirette · quota diretta <q>% delle notti»
  (se zero: «Ieri <gg/mm>: nessuna nuova prenotazione»).
- Riga 2: per hotel «Acadia d/o · Hartmann d/o · Saslong d/o» (d = dirette, o = portali).
- Riga 3, solo se ce ne sono: «Cancellate: <n> (<notti> notti), di cui <k> da portali».
- Riga 4: «Piattaforma IA: camere libere aggiornate <gg/mm hh:mm>, <k> ricostruzioni in 26 ore» oppure
  «ATTENZIONE: camere libere ferme dal <gg/mm>».
- Solo lunedì: «IA (Google): alpstay.eu citato <n> volte, ultima <gg/mm> · quota <q>% vs portali» e
  «Google: <k> parole chiave, <t> in top 10, ~<v> visite/mese stimate».
- Se La Scatola non è fresca: «Dati La Scatola non aggiornati dal <gg/mm hh:mm>».

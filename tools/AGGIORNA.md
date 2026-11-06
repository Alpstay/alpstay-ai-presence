# Attività pianificata: camere libere da La Scatola

Da creare come attività pianificata di Claude (Europe/Rome, ogni giorno alle 6:13 e alle 14:13,
nessuna notifica), con il testo qui sotto come istruzione.

---

Aggiorna le camere libere degli hotel AlpStay sulla piattaforma pubblica "AlpStay AI Presence"
(https://alpstay.github.io/alpstay-ai-presence/) leggendo La Scatola (connettore "La Scatola", dati del
gestionale Slope, sola lettura). Lavori senza nessuno che risponda: non fare domande, segui la procedura
e chiudi con un riepilogo breve.

CONTESTO
- Repository GitHub Alpstay/alpstay-ai-presence (pubblico). La pagina non legge La Scatola da sola: va
  rigenerato `disponibilita.json`. Al push, GitHub ricostruisce e ripubblica il sito da solo.
- Si usa SOLO la vista `curated_availability_daily` (conteggi di camere, nessun dato ospite).

PASSI
1. Collega il repository con lo strumento add_repo (owner "Alpstay", repo "alpstay-ai-presence", access
   "push"), clonalo se non è già presente e allinealo a origin/main (git fetch origin main, poi
   git reset --hard origin/main).
2. Freschezza: mcp__La_Scatola__get_freshness (se manca caricalo con ToolSearch). Se lo stato complessivo
   è "failing", non pubblicare e fermati: la pagina continua con l'ultimo file e dopo 30 ore lo segnala
   da sola come non aggiornato.
3. Dalla cartella del repository: `node tools/finestre.mjs` → lista JSON di intervalli {"from","to"}.
4. Annota l'ora UTC (ISO). Per OGNI intervallo una chiamata mcp__La_Scatola__query_curated_view con
   view "curated_availability_daily", filters [{"field":"day","op":"gte","value":<from>},
   {"field":"day","op":"lte","value":<to>}], limit 500, NESSUNA aggregazione né group_by (danno errore).
   Se page.next_cursor non è nullo, ripeti la stessa chiamata con quel cursor finché è nullo.
5. `node tools/disponibilita.mjs --registro --da <ora annotata> > disponibilita.json`. Il programma
   legge le risposte dal registro di questa sessione: NON ricopiare né riassumere le risposte e non
   aprire i file in cui il sistema salva le risposte grandi. Deve stampare una riga RIEPILOGO; se stampa
   ERRORE o esce con codice diverso da 0, NON pubblicare (`git checkout disponibilita.json`).
6. `git add disponibilita.json`, commit "Camere libere <AAAA-MM-GG HH:MM>", `git push origin HEAD:main`.
   Se il push è rifiutato perché il repository è cambiato: copia il file fuori, git fetch origin main,
   git reset --hard origin/main, rimetti il file, add, commit, push. Una volta sola. Se il rifiuto è
   403, non insistere: scrivilo nel riepilogo. Poi controlla con `git log origin/main -1`.

REGOLE
- Non modificare mai gli ID ricevuti da Slope/La Scatola (li copia il programma, identici).
- Non modificare nessun altro file del repository. Se un programma ha un difetto, descrivilo.
- Nessun nome di ospite, importo o dato di prenotazione nei comandi, nei commit o nel riepilogo.

RIEPILOGO (italiano, massimo 5 righe): pubblicato sì/no con commit, freschezza di La Scatola, riga
RIEPILOGO del programma, anomalie con il testo esatto.

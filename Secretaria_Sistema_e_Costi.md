# Secretar.ia — Architettura del Sistema e Piano Costi

> Documento tecnico aggiornato al 29 aprile 2026.
> Descrive il funzionamento attuale del sistema e i costi AI/infrastrutturali attesi.

---

## 1. Panoramica generale

**Secretar.ia** è un inbox manager intelligente per aziende logistiche. Centralizza le email operative in una Kanban board, le classifica automaticamente tramite AI, calcola le scadenze SLA e assiste l'operatore nella stesura delle risposte usando una base di conoscenza aziendale (wiki RAG).

**Stack tecnico:**
- **Frontend / Backend:** Next.js (App Router) — tutto su un'unica applicazione
- **Database e Auth:** Supabase (PostgreSQL + Storage + Auth)
- **AI:** Anthropic API (Claude Opus 4.6, Claude Haiku 4.5)
- **Email:** Postmark (inbound webhook + outbound API)

---

## 2. Moduli del sistema

### 2.1 Kanban Board

La schermata principale dell'applicazione. Mostra tutte le email in 3 colonne:

| Colonna | Stato |
|---|---|
| Arrivate | `arrived` — email nuova, non ancora presa in carico |
| In lavorazione | `in_progress` — operatore ci sta lavorando |
| Risposte | `replied` — risposta inviata |

**Funzionalità:**
- Drag-and-drop tra colonne
- Barra di ricerca full-text (oggetto, mittente, corpo)
- Filtri per settore (Traffico / Magazzino / Amministrazione)
- `StatsRow` in cima: conteggio email per colonna + alert SLA scaduti (in rosso se > 0)

Ogni card della Kanban mostra:
- Token code (es. `2026-TRA-001`)
- 3 notions (classificazione AI)
- Chip SLA con countdown live
- Token Health indicator

---

### 2.2 Logistics Tokenization (AI)

**File:** `lib/logistics/tokenize.ts`

Quando arriva una nuova email, viene eseguita automaticamente la tokenizzazione. Questo è il primo posto in cui entra Claude.

**Pipeline:**
1. L'email (oggetto + corpo) viene inviata a **Claude Opus 4.6** via tool-use
2. Claude estrae e restituisce strutturati:
   - `category_code` → `TRA | FAT | SUP | COM | AMM | GEN`
   - `settore` → `Traffico | Magazzino | Amministrazione`
   - `notion_1/2/3` → 3 frasi descrittive del messaggio
   - `dati_estratti` → numero spedizione, targa, tipo documento, luoghi, grado urgenza
3. Il sistema genera il token code sequenziale: **`YYYY-CAT-NNN`** (es. `2026-TRA-001`)

**Prompt caching:** system prompt e tool schema hanno `cache_control: ephemeral` → risparmio su chiamate ripetute.

**Categorie:**

| Codice | Descrizione |
|---|---|
| TRA | Trasporto / Spedizione |
| FAT | Fatturazione / Pagamento |
| SUP | Supporto tecnico |
| COM | Commerciale / Vendite |
| AMM | Amministrativo / Contratti |
| GEN | Generale / Altro |

---

### 2.3 Modulo SLA

**File:** `lib/logistics/sla.ts`

Calcola scadenze e stati SLA per ogni email attiva (non risposte, non archiviate).

**Soglie per `grado_urgenza` (da dati_estratti AI):**

| Urgenza | Finestra SLA |
|---|---|
| critica | 2 ore |
| alta | 4 ore |
| media | 24 ore |
| bassa | 48 ore |
| default | 24 ore |

**Stati SLA:**
- `ok` → più del 25% del tempo rimasto
- `warning` → meno del 25% del tempo rimasto (chip giallo)
- `breach` → scaduto → card con bordo rosso pulsante

Il `SlaChip` sulla card si aggiorna ogni minuto via `setInterval` lato client.

---

### 2.4 Generazione Risposta AI

**File:** `app/api/ai/generate-response/route.ts`

Quando l'operatore clicca "Genera risposta", si eseguono **due chiamate AI in sequenza**:

**Step 1 — RAG query wiki** (`lib/kb/query.ts`)
Vedi sezione 2.5 per i dettagli.

**Step 2 — Generazione risposta** (streaming)

Usa **Claude Opus 4.6** con `thinking: { type: 'adaptive' }`.

Il system prompt è composto dinamicamente da:
1. Istruzioni base ("sei un assistente professionale in italiano...")
2. Contesto wiki (se trovato) — documentazione aziendale pertinente all'email
3. Dati spedizione (se trovata via lookup) — stato reale della spedizione dal DB

La risposta viene streamata carattere per carattere al frontend.

Dopo la generazione, l'operatore può:
- **Approvare** → la risposta viene salvata in `ai_responses` + l'email viene inviata via Postmark
- **Rifiutare** → la risposta viene scartata, ticket torna in lavorazione

---

### 2.5 LLM Wiki — Knowledge Base RAG

**File:** `lib/kb/ingest.ts`, `lib/kb/query.ts`, `lib/kb/wiki-manager.ts`

Sistema a 3 fasi per costruire e interrogare una base di conoscenza aziendale.

#### Fase 1 — Upload
**Endpoint:** `POST /api/kb/upload` (richiede header `Authorization: Bearer <INGEST_SECRET>`)

Il file viene caricato nel bucket Supabase Storage `kb-raw` e viene creata una riga in `kb_raw_sources` con stato `pending`.

**Formati accettati:** PDF, TXT, MD, CSV (DOCX e XLSX vengono accettati dall'upload ma non ancora elaborati nella fase 2).

#### Fase 2 — Process (Ingest)
**Endpoint:** `POST /api/kb/process` (richiede header `Authorization: Bearer <INGEST_SECRET>`)

1. Recupera le sorgenti con stato `pending`
2. Scarica il file da Supabase Storage
3. Estrae il testo (pdf-parse per PDF, `.text()` per gli altri)
4. Invia il testo a **Claude Opus 4.6** con il wiki esistente come contesto
5. Claude restituisce un JSON con le pagine wiki da creare/aggiornare
6. Le pagine vengono salvate in `kb_wiki_pages` con slug, titolo, contenuto Markdown, categoria

**Categorie wiki:** `tariffe | procedure | faq | prodotti | contatti | altro`

La pagina speciale `index` viene sempre aggiornata come indice del wiki.

#### Fase 3 — Query (RAG a runtime)
**File:** `lib/kb/query.ts` — chiamata automatica ad ogni generazione risposta

Usa **Claude Haiku 4.5** come agente tool-use con 2 strumenti:
- `read_pages(slugs[])` → carica il contenuto completo di pagine specifiche
- `search_pages(keyword)` → cerca per parola chiave in titolo e contenuto

L'agente fa fino a **5 iterazioni**, poi il contesto raccolto viene iniettato nel system prompt di generazione.

**Stato attuale:** il sistema funziona solo via API (non c'è ancora un'interfaccia grafica per il wiki).

---

### 2.6 Email — Postmark Integration

**File:** `lib/email/send.ts`, `app/api/webhooks/postmark/route.ts`

**Inbound (ricezione):**
- Postmark riceve le email all'indirizzo configurato
- Le inoltra via webhook a `POST /api/webhooks/postmark`
- Il webhook verifica il token (`X-Webhook-Token`) e crea il ticket nel DB

**Outbound (invio):**
- Quando l'operatore approva una risposta, `sendReply()` chiama l'API Postmark
- Aggiunge `In-Reply-To` per il threading corretto nel client email del destinatario

**Variabili d'ambiente necessarie:**
```
POSTMARK_SERVER_TOKEN=...
POSTMARK_WEBHOOK_TOKEN=...
POSTMARK_REPLY_FROM=...   # opzionale — override mittente
```

**Stato attuale:** il codice è completo ma Postmark non è ancora configurato nell'account.

---

### 2.7 Autenticazione

Login con email/password via Supabase Auth. Recupero password con OTP via email (e SMS opzionale). Pagine: `/login`, `/reset-password`.

---

## 3. Flusso end-to-end

```
Email cliente
     │
     ▼
[Postmark inbound]
     │ webhook
     ▼
POST /api/webhooks/postmark
     │ crea riga in `messages`
     ▼
tokenizeMessage()           ← Claude Opus 4.6 (tool-use)
     │ salva token_code, notions, settore, dati_estratti
     ▼
Kanban Board — colonna "Arrivate"
     │
     │ operatore clicca "Genera risposta"
     ▼
queryWikiContext()          ← Claude Haiku 4.5 (tool-use, max 5 iter)
     │ trova pagine wiki pertinenti
     ▼
generate-response stream    ← Claude Opus 4.6 (adaptive thinking)
     │ streaming al frontend
     ▼
Operatore approva
     │
     ├─ sendReply()         ← Postmark API
     └─ salva in ai_responses, aggiorna status → replied
```

---

## 4. Piano Costi

### 4.1 Pricing Anthropic API

| Modello | Input | Output |
|---|---|---|
| Claude Opus 4.6 | $15 / MTok | $75 / MTok |
| Claude Haiku 4.5 | $0.80 / MTok | $4 / MTok |

> I **thinking tokens** (adaptive thinking) vengono fatturati come output al costo di Opus.

---

### 4.2 Costo per email ricevuta

**Tokenizzazione** (eseguita automaticamente ad ogni email in arrivo):
- Input: ~2.000–3.000 token (oggetto + corpo email troncato)
- Output: ~300–500 token (tool_use JSON)
- Prompt cache hit: riduce il costo input di ~90% dopo la prima chiamata
- **Costo con cache:** ~$0.004 | **Senza cache:** ~$0.035

---

### 4.3 Costo per "Genera risposta" (clic operatore)

| Step | Modello | Input (token) | Output (token) | Costo stimato |
|---|---|---|---|---|
| RAG query wiki | Haiku 4.5 | ~8.000 (2–3 iter) | ~1.200 | ~$0.011 |
| Generazione risposta | Opus 4.6 | ~5.000 | ~2.000 testo + ~5.000 thinking | ~$0.55 |
| **Totale per generazione** | | | | **~$0.56** |

> La voce dominante è il **thinking** di Opus 4.6. Con thinking disabilitato il costo scenderebbe a ~$0.23. Con Sonnet 4.6 invece di Opus (senza thinking) scenderebbe a ~$0.05.

---

### 4.4 Costo per documento wiki caricato (una tantum)

| Documento | Input stimato | Output (max 8.000 token) | Costo |
|---|---|---|---|
| Documento breve (~5 pag.) | ~8.000 token | ~4.000 token | ~$0.42 |
| Documento lungo (~20 pag.) | ~20.000 token | ~8.000 token | ~$0.90 |

---

### 4.5 Stime mensili per volume

Assunzioni: operatore usa "Genera risposta" sul 60% delle email, tokenizzazione sempre (con cache attiva dopo le prime chiamate).

| Volume email/giorno | Tokenizzazioni | Generazioni | Costo AI/mese |
|---|---|---|---|
| 10 email/giorno | $0.04 | $100 | **~$100/mese** |
| 30 email/giorno | $0.12 | $300 | **~$300/mese** |
| 80 email/giorno | $0.32 | $800 | **~$800/mese** |

---

### 4.6 Costi infrastruttura

| Servizio | Piano | Costo |
|---|---|---|
| Supabase | Free tier (fino a 500MB DB, 1GB storage) | €0 |
| Supabase | Pro (se supera i limiti free) | $25/mese |
| Postmark | Starter (fino a 100 email/mese) | $0 |
| Postmark | 10.000 email/mese | ~$10/mese |
| Vercel (deploy Next.js) | Hobby (free) / Pro | €0 / $20/mese |

---

### 4.7 Scenario MVP realistico (fase lancio)

Per una piccola azienda logistica in fase di test con 10–20 email/giorno:

| Voce | Costo mensile stimato |
|---|---|
| AI Anthropic (tokenizzazione + generazione) | ~$60–$120 |
| Supabase | €0 (free tier) |
| Postmark | €0 (free tier) |
| Vercel | €0 (hobby) |
| **Totale** | **~€55–€110/mese** |

---

### 4.8 Leve per ridurre i costi AI

In ordine di impatto:

1. **Disabilitare `thinking`** su Opus → risparmio ~40% sul costo di generazione
2. **Usare Claude Sonnet 4.6** per le risposte invece di Opus → costo ~10x inferiore a parità di qualità accettabile
3. **Non generare automaticamente** per tutte le email → l'operatore sceglie quando usare l'AI
4. **Caching prompt** già attivo sulla tokenizzazione — nessuna azione necessaria

---

## 5. Limitazioni e TODO noti

| Problema | Impatto | Priorità |
|---|---|---|
| Postmark non configurato | Il flusso email non funziona end-to-end | Alta |
| Nessuna UI per il wiki | KB gestibile solo via API con curl | Media |
| Upload DOCX/XLSX non elaborati | I file Word vengono accettati ma non processati | Bassa |
| `/api/kb/pages` senza auth | Pagine wiki leggibili senza login (solo con company_id) | Bassa (MVP single-tenant) |
| Audit log non implementato | Nessuna traccia delle azioni degli operatori | Post-MVP |

---

*Generato da Claude Sonnet 4.6 — Secretar.ia inbox-manager*

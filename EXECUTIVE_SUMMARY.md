# Executive Summary — Secretar.ia / InboxManager

> Documento di riferimento per sessioni future. Aggiornato al 2026-05-06.

---

## 1. Cos'è il prodotto

**Secretar.ia** (working name: InboxManager) è un SaaS per PMI italiane che fa da segretaria operativa AI. Riceve email dai clienti, le classifica automaticamente per categoria e urgenza, suggerisce risposte generate da AI, e permette agli operatori di approvare o rifiutare prima dell'invio. Il progetto è in fase MVP.

**Utente:** Alessandro Pompili (`alexsandro.pompili@gmail.com`) — founder, non sviluppatore senior.

---

## 2. Stack tecnico

| Layer | Tecnologia |
|-------|-----------|
| Framework | Next.js 16 (App Router, Server Actions) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| AI | Anthropic Claude API |
| Email inbound | Postmark (webhook inbound) |
| Email outbound | Postmark (API invio) |
| Hosting | Vercel |
| Stile | Tailwind CSS v4 |

**Note importanti:**
- Il middleware si chiama `proxy.ts` (non `middleware.ts`) — Next.js 16 lo richiede così
- Tutti i client DB lato server usano `createServiceClient()` (service role key), mai l'anon client
- Non esiste ancora multi-tenancy — rimandato a dopo MVP completo

---

## 3. Configurazione Supabase

- **URL:** `https://nymlnpdltuvrnbdmctki.supabase.co`
- **Company ID di test:** `bf46bcf2-ad9e-4e35-aa0e-a2d350601573`

### Tabelle principali

| Tabella | Contenuto |
|---------|-----------|
| `companies` | Aziende clienti |
| `email_accounts` | Caselle email gestite (ancora vuota — da configurare) |
| `messages` | Tutti i ticket/email in arrivo |
| `ai_responses` | Storico risposte AI (inviate, rifiutate, bozze) |
| `spedizioni` | Dati spedizioni per lookup automatico |
| `kb_raw_sources` | Documenti caricati nella wiki |
| `kb_wiki_pages` | Pagine wiki generate dall'AI |
| `kb_wiki_log` | Log delle operazioni wiki |

### Campi chiave della tabella `messages`

`id`, `status` (arrived/in_progress/replied), `received_at`, `from_email`, `from_name`, `to_email`, `subject`, `body`, `channel` (email/whatsapp), `priority`, `assigned_to`, `company_id`, `token_code`, `notion_1/2/3`, `dati_estratti`, `external_message_id`, `email_account_id`

---

## 4. Variabili d'ambiente

### In `.env.local` (locale)

| Variabile | Stato |
|-----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Configurata |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Configurata |
| `SUPABASE_SERVICE_ROLE_KEY` | Configurata |
| `ANTHROPIC_API_KEY` | Configurata |
| `INGEST_SECRET` | `inbox-manager-secret-2026` |
| `POSTMARK_SERVER_TOKEN` | **Placeholder — da configurare** |
| `POSTMARK_WEBHOOK_TOKEN` | **Placeholder — da configurare** |
| `POSTMARK_REPLY_FROM` | Opzionale — override mittente risposte |

### Su Vercel (produzione)
Tutte le variabili sopra devono essere aggiunte manualmente nella dashboard Vercel. Non vengono sincronizzate automaticamente dal `.env.local`.

---

## 5. Configurazione Postmark (parziale)

- **Server API Token:** `1e5e0adf-4170-4f59-bd6e-a47abbdec661`
- **Indirizzo inbound:** `2d8f886b76591e02f99b297a6afa8425@inbound.postmarkapp.com`
- **Webhook URL produzione:** `https://inbox-manager-five.vercel.app/api/webhooks/postmark?token=secretaria2026`
- **POSTMARK_WEBHOOK_TOKEN:** `secretaria2026`

### Cosa manca per far funzionare l'email

1. Aggiungere su Vercel: `POSTMARK_SERVER_TOKEN` e `POSTMARK_WEBHOOK_TOKEN`
2. Inserire riga in `email_accounts` su Supabase (il webhook la cerca per collegare l'email all'azienda)
3. Verificare Sender Signature su Postmark (serve accesso alla casella mittente)
4. Configurare Gmail forwarding verso l'indirizzo inbound Postmark
5. Testare flusso end-to-end

---

## 6. Flusso del sistema

### Email in arrivo
1. Email arriva su Gmail → forwarding verso Postmark inbound
2. Postmark chiama webhook `POST /api/webhooks/postmark?token=...`
3. Il webhook cerca l'indirizzo destinatario in `email_accounts` → ricava `company_id`
4. Crea il record in `messages` con status `arrived`
5. Esegue tokenizzazione AI (Haiku) → riempie `token_code`, `notion_1/2/3`, `dati_estratti`
6. Il ticket appare nel Kanban/Dashboard

### Risposta AI
1. Operatore apre il ticket → si apre il pannello `MessageDetail`
2. Il sistema cerca automaticamente la spedizione correlata (`/api/spedizioni/lookup`)
3. Appena la spedizione è risolta, parte auto-generazione streaming della risposta AI
4. L'AI usa: contesto wiki pertinente + dati spedizione + corpo email
5. Operatore può modificare la bozza, poi clicca il bottone "invia" (freccia verde)
6. `approveAndSendAction` invia l'email via Postmark e aggiorna lo status a `replied`

### Wiki aziendale
1. Operatore carica documento su `/wiki` (PDF, TXT, MD, CSV — max 10MB)
2. Clicca "Elabora" → Claude Sonnet legge il documento e genera pagine wiki strutturate
3. Ogni pagina wiki viene salvata in `kb_wiki_pages`
4. Quando arriva un ticket, `queryWikiContext` cerca le pagine pertinenti e le inietta nel prompt AI

---

## 7. Modelli AI e costi

| Operazione | Modello | Costo stimato |
|-----------|---------|---------------|
| Tokenizzazione ticket in arrivo | claude-haiku-4-5-20251001 | ~$0.001 |
| Generazione risposta AI | claude-sonnet-4-6 | ~$0.005–0.010 |
| Elaborazione documento wiki | claude-sonnet-4-6 | ~$0.05–0.20 |
| Query wiki context | claude-haiku-4-5-20251001 | ~$0.001 |

**Costo stimato per ticket completo (arrivo + risposta): ~$0.01**

I costi API Anthropic vengono da `console.anthropic.com` — account separato dall'abbonamento Claude.ai.

---

## 8. Struttura pagine dell'app

| URL | Descrizione |
|-----|-------------|
| `/` | Dashboard con 5 card categoria + 3 stat button |
| `/?category=Spedizioni` | Kanban filtrato per categoria |
| `/tickets` | Lista tutti i ticket (rimossa dalla sidebar) |
| `/tickets/today` | Lista ticket arrivati oggi |
| `/tickets/urgent` | Lista ticket urgenti (alta/critica) |
| `/stats` | Report: trend messaggi, messaggi per settore |
| `/wiki` | Wiki aziendale: upload documenti, pagine generate |
| `/archivio` | Ricerca ticket conclusi (ultimi 30 giorni) |
| `/audit-log` | Pagina placeholder — non ancora implementata |
| `/settings` | Pagina placeholder — non ancora implementata |
| `/login` | Autenticazione Supabase |

---

## 9. Categorie fisse

La funzione `mapToFixedCategory()` (in `app/page.tsx` e `app/archivio/page.tsx`) mappa `notion_1` a una di queste 5 categorie:

- **Spedizioni** (default)
- **Reclami** (reclam, contestaz, lament)
- **Fatture** (fattur, pagament, rimborso)
- **Richieste dipendenti** (dipendent, ferie, permess, stipend)
- **Ordini** (ordin, acquist, forni)

---

## 10. Componenti chiave

| File | Ruolo |
|------|-------|
| `app/components/layout/Sidebar.tsx` | Sidebar con toggle slide, tema bianco |
| `app/components/layout/AppShell.tsx` | Shell con sidebar + contenuto principale |
| `app/components/kanban/KanbanBoard.tsx` | Kanban 3 colonne con drag-and-drop |
| `app/components/kanban/MessageCard.tsx` | Card ticket nel kanban |
| `app/components/message/MessageDetail.tsx` | Pannello dettaglio ticket (slide-over) |
| `app/components/tickets/TicketsList.tsx` | Lista piatta ticket per pagine today/urgent |
| `app/components/dashboard/CategoryDashboard.tsx` | Dashboard home con card categorie |
| `app/stats/StatsClient.tsx` | Grafici statistiche (recharts) |
| `app/wiki/WikiClient.tsx` | UI wiki: upload, lista documenti, pagine |
| `lib/logistics/tokenize.ts` | Tokenizzazione AI dei messaggi in arrivo |
| `lib/logistics/spedizione-lookup.ts` | Ricerca spedizione da testo email |
| `lib/kb/ingest.ts` | Elaborazione documenti wiki con Claude |
| `lib/kb/query.ts` | Query contesto wiki per risposta AI |
| `app/api/webhooks/postmark/route.ts` | Webhook ricezione email Postmark |
| `app/api/ai/generate-response/route.ts` | Streaming risposta AI |
| `app/actions/ai-responses.ts` | Server actions: approva/rifiuta/storico |

---

## 11. Funzionalità MessageDetail (pannello ticket)

Il pannello è un slide-over da destra, diviso in due sezioni ridimensionabili:

- **TOP (email):** metadati mittente/destinatario, dati spedizione, corpo email
- **DIVIDER:** linea trascinabile con il mouse — regola la proporzione tra i due pannelli
- **BOTTOM (AI):** textarea con risposta auto-generata in streaming, label "bozza generata da IA", link "Rigenera", pulsante "Rifiuta", pulsante invio (freccia emerald stile WhatsApp)

Auto-generazione: scatta automaticamente quando si apre il ticket, senza pulsante. Usa `autoGeneratedForId` ref per non rigenerare se il pannello si riapre sullo stesso ticket.

---

## 12. Design system

- **Sfondo:** bianco ovunque (`bg-white`)
- **Bordi:** `border-gray-200` / `border-gray-100`
- **Testo primario:** `text-gray-900`
- **Testo secondario:** `text-gray-500` / `text-gray-400`
- **Voce sidebar attiva:** `bg-gray-900 text-white`
- **Accenti colore:** blue (info), emerald (successo/invia), amber (warning), red (errore/urgente)
- **Nessun colore vivace** come sfondo di pagina o card principali

---

## 13. Cosa manca per il go-live

1. **Postmark** — sender signature verificata + env vars Vercel + riga `email_accounts` + Gmail forwarding + test end-to-end
2. **Audit Log** — pagina `/audit-log` non ancora costruita (solo link in sidebar)
3. **Settings** — pagina `/settings` non ancora costruita
4. **Password dimenticata** — Supabase manda magic link invece di OTP a 6 cifre (fix: sostituire `{{ .ConfirmationURL }}` con `{{ .Token }}` nei template email Supabase)
5. **Multi-tenancy** — rimandato esplicitamente a dopo MVP

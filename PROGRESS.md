# Secretar.ia — Stato avanzamento lavori

> Aggiornato al 09 maggio 2026

---

## ✅ Completato

### Sessione 09 maggio 2026

#### Fix categorizzazione email
- La funzione `mapToFixedCategory` in `app/page.tsx` ora usa **tre livelli** in cascata: codice categoria del token AI (`COM`→Ordini, `FAT`→Fatture), poi tutte e tre le nozioni + il soggetto dell'email, poi default Spedizioni.
- Problema risolto: email con oggetto "ordini" finiva in Spedizioni perché si guardava solo `notion_1`.

#### Auto-refresh e badge notifica per categoria
- La `CategoryDashboard` si aggiorna automaticamente quando arriva un'email nuova tramite **Supabase Realtime** (INSERT sulla tabella `messages`) + **polling ogni 30 secondi** come fallback.
- Quando arriva una nuova email appare un **pallino rosso** con contatore sul bottone della categoria corrispondente. Il badge persiste in `localStorage` e sparisce quando si clicca il bottone.
- Solo le email root (non risposte ai thread) generano badge.

#### UI Kanban — bordi card per colonna
- Le card dei ticket hanno ora un bordo colorato che corrisponde alla colonna: **blu** (Arrivato), **arancione** (In svolgimento), **verde** (Concluso).
- Rimosso il badge di urgenza (health dot) e tutta la logica di colore basata sull'SLA.

#### UI Kanban — rimozione SLA e filtro canale
- Rimossa la chip "ore di scadenza" (SlaChip) dai ticket.
- Rimosso il filtro "Canale" (Tutti / WhatsApp) dalla barra di ricerca — rimangono solo Priorità e Data.

#### Chat ticket — pannello resta aperto dopo invio
- Dopo "Approva e invia" il pannello chat non si chiude più.
- Il messaggio inviato appare come bubble nella chat (stile WhatsApp).
- Il ticket viene spostato in "In svolgimento" senza chiudere la vista.

#### Allegati email — supporto completo inbound e outbound
- **In entrata**: il webhook Postmark (`/api/webhooks/postmark`) legge gli allegati base64, li carica su **Supabase Storage** (bucket `attachments`), salva i metadati in `messages.attachments` (colonna JSONB).
- **In uscita**: bottone spilletta (📎) nell'area di composizione. I file selezionati appaiono come chip con anteprima per le immagini. Al momento dell'invio vengono allegati all'email via Postmark e salvati su Storage in `ai_responses.attachments`.
- **Visualizzazione**: immagini mostrate come miniatura inline; altri file (PDF, Word, Excel…) come card con icona colorata + download. Allegati inviati visibili nella bubble della risposta.
- **Prerequisiti DB**: `ALTER TABLE messages ADD COLUMN attachments JSONB DEFAULT '[]'` e `ALTER TABLE ai_responses ADD COLUMN attachments JSONB DEFAULT '[]'` — già eseguiti.
- **Storage**: bucket `attachments` creato su Supabase (pubblico).

#### Bottone "Genera risposta IA"
- Rimossa la generazione automatica all'apertura del ticket.
- Aggiunto cerchio **IA** (indigo) nella colonna dei bottoni sopra la spilletta. Cliccarlo genera la bozza AI; durante lo streaming mostra un quadrato stop; se c'è già una bozza funge da "Rigenera".

---

### Modello AI generazione risposta
- Il file `app/api/ai/generate-response/route.ts` usa già **Claude Sonnet 4.6** (non Opus)
- Nessun `thinking` attivo — costo per generazione ~$0.05 invece di ~$0.56

### Postmark — server e webhook
- Creato server **Secretar.ia** su Postmark (Server ID: 19148707)
- `POSTMARK_SERVER_TOKEN` → `aa6b9960-4508-4e35-ab83-e8ec36628903`
- `POSTMARK_WEBHOOK_TOKEN` → `secretaria-2026-webhook`
- Webhook URL configurato: `https://inbox-manager-five.vercel.app/api/webhooks/postmark?token=secretaria-2026-webhook`

### Dominio inbox-manager.it
- Dominio acquistato su Register.it (gratuito primo anno)
- DNS verificati su Postmark: DKIM ✅ Return-Path ✅
- Firma `info@inbox-manager.it` (Secretar.ia) creata su Postmark
- Casella email `info@inbox-manager.it` creata su Register.it
- Record MX aggiunto su Register.it → `inbound.postmarkapp.com` (priorità 10) ⏳ propagazione in corso

### Supabase
- Tabella `companies`: **Test Company** (id: `b96f4c6d-ea64-4a69-a9dc-0f98b9503ffb`)
- Tabella `email_accounts`: `info@inbox-manager.it` collegata a Test Company ✅

### Vercel
- URL produzione: `https://inbox-manager-five.vercel.app`
- Variabili d'ambiente configurate: `POSTMARK_SERVER_TOKEN`, `POSTMARK_WEBHOOK_TOKEN`, `POSTMARK_REPLY_FROM` ✅
- `.env.local` aggiornato con tutti i valori reali ✅

---

## ⏳ In attesa — propagazione record MX

Il record MX `inbox-manager.it → inbound.postmarkapp.com` è stato aggiunto ma non si è ancora propagato.

**Test da fare appena propagato:**
1. Manda un'email a `info@inbox-manager.it` dalla tua Gmail
2. Verifica che il ticket appaia nella Kanban su `https://inbox-manager-five.vercel.app`
3. Apri il ticket → clicca "Genera risposta AI" → Approva e invia
4. Verifica che l'email di risposta arrivi al mittente

**Se il test fallisce, verificare:**
- Postmark → Default Inbound Stream → Activity: l'email è arrivata a Postmark?
- Vercel → Functions logs: il webhook ha restituito errore?
- Supabase → tabella `email_accounts`: la riga `info@inbox-manager.it` esiste?

---

## ⏳ Da fare — conferma firma Postmark

La firma `info@inbox-manager.it` su Postmark non è ancora confermata (email di verifica non ricevuta).
Controllare periodicamente la Webmail Register.it (`info@inbox-manager.it`) per il link di conferma.

---

## 🔜 Prossimi step

- Costruire UI per gestione wiki (knowledge base) — attualmente gestibile solo via API
- Aggiornare nome azienda in `companies` quando definito
- Valutare RLS su Supabase quando si aggiungono più clienti
- Audit Log pagina (placeholder nella sidebar, da costruire)

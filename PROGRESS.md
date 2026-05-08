# Secretar.ia — Stato avanzamento lavori

> Aggiornato al 07 maggio 2026

---

## ✅ Completato

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

-- Add settore and dati_estratti fields to the messages table
--
-- settore: fixed-value sector classification (Traffico / Magazzino / Amministrazione)
-- dati_estratti: structured JSON with entities extracted from the message body
--   (targhe, numeri_spedizione, date_consegna, quantita, prodotti, etc.)

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS settore TEXT DEFAULT NULL
    CONSTRAINT messages_settore_check CHECK (
      settore IS NULL OR settore IN ('Traffico', 'Magazzino', 'Amministrazione')
    ),
  ADD COLUMN IF NOT EXISTS dati_estratti JSONB DEFAULT NULL;

-- Index for filtering by sector
CREATE INDEX IF NOT EXISTS messages_settore_idx ON messages(settore) WHERE settore IS NOT NULL;

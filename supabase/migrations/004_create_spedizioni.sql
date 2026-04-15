-- Tabella spedizioni
-- Ogni record rappresenta una spedizione identificata da un numero univoco
-- nel formato SP-YYYY-NNN (es. SP-2026-001).
--
-- Il sistema AI cerca automaticamente questo pattern nei messaggi email
-- e inietta i dati trovati nel prompt di generazione risposta.

CREATE TABLE IF NOT EXISTS spedizioni (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                  TEXT UNIQUE NOT NULL,          -- SP-2026-001
  stato                   TEXT NOT NULL,                 -- In transito / Consegnato / Ritardo / In attesa / Fermo
  posizione_attuale       TEXT DEFAULT NULL,             -- es. "Milano Smistamento"
  data_prevista_consegna  TIMESTAMPTZ DEFAULT NULL,      -- data/ora prevista consegna
  nome_autista            TEXT DEFAULT NULL,
  targa                   TEXT DEFAULT NULL,             -- targa automezzo
  mittente                TEXT DEFAULT NULL,             -- azienda/persona mittente
  destinatario            TEXT DEFAULT NULL,             -- azienda/persona destinataria
  indirizzo_destinazione  TEXT DEFAULT NULL,             -- indirizzo completo di consegna
  note                    TEXT DEFAULT NULL,             -- note operative aggiuntive
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indice per ricerca rapida per numero (usato dal lookup AI)
CREATE INDEX IF NOT EXISTS spedizioni_numero_idx ON spedizioni(numero);

-- Dati di esempio per test
INSERT INTO spedizioni (numero, stato, posizione_attuale, data_prevista_consegna, nome_autista, targa, mittente, destinatario, indirizzo_destinazione, note)
VALUES
  ('SP-2026-001', 'In transito',  'Milano Smistamento',    NOW() + INTERVAL '1 day',    'Marco Bianchi',  'AB123CD', 'Magazzino Centrale Roma',  'Cliente Rossi Srl',      'Via Dante 5, 20100 Milano',         NULL),
  ('SP-2026-002', 'Ritardo',      'Bologna - fermo doganale', NOW() + INTERVAL '2 days', 'Luigi Verdi',   'EF456GH', 'Fornitore XYZ Napoli',     'Tech Solutions Srl',     'Via Garibaldi 12, 40100 Bologna',   'Fermo per controllo doganale'),
  ('SP-2026-003', 'Consegnato',   NULL,                     NOW() - INTERVAL '2 hours',  'Anna Neri',     'IJ789KL', 'Deposito Nord Torino',     'Mario Ferrari',           'Corso Italia 88, 10100 Torino',     NULL),
  ('SP-2026-004', 'In attesa',    'Deposito Firenze',       NOW() + INTERVAL '3 days',   'Paolo Blu',     'MN012OP', 'Hub Centrale Firenze',     'Ristorante da Mario',     'Piazza della Repubblica 1, Firenze', 'Merce deperibile - priorità alta')
ON CONFLICT (numero) DO NOTHING;

/**
 * Spedizione lookup helpers
 *
 * Extracts SP-YYYY-NNN shipment codes from free text and queries the
 * spedizioni table in Supabase.
 *
 * Pattern: SP- followed by 4 digits, a dash, and 3 digits (e.g. SP-2026-001).
 * Case-insensitive; the returned code is always uppercased.
 */

import { createServiceClient } from '@/lib/supabase/service'
import type { Spedizione } from '@/types/database'

const SP_PATTERN = /\bSP-\d{4}-\d{3}\b/i

/** Extract the first SP-XXXX-XXX code found in the given text, or null. */
export function extractSpedizioneNumero(text: string): string | null {
  const match = SP_PATTERN.exec(text)
  return match ? match[0].toUpperCase() : null
}

/** Look up a spedizione by its numero. Returns null if not found. */
export async function lookupSpedizione(numero: string): Promise<Spedizione | null> {
  const db = createServiceClient()

  const { data, error } = await db
    .from('spedizioni')
    .select('*')
    .eq('numero_spedizione', numero.toUpperCase())
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null   // no row found
    throw new Error(`[spedizione-lookup] ${error.message}`)
  }

  return data as Spedizione
}

/**
 * Convenience: extract the code from subject + body, then look it up.
 * Returns { numero, spedizione } — numero is set even when spedizione is null
 * (means the pattern was found but no matching record exists).
 */
export async function findSpedizioneInMessage(params: {
  subject: string
  body: string
}): Promise<{ numero: string | null; spedizione: Spedizione | null }> {
  const text = `${params.subject}\n${params.body}`
  const numero = extractSpedizioneNumero(text)

  if (!numero) return { numero: null, spedizione: null }

  const spedizione = await lookupSpedizione(numero)
  return { numero, spedizione }
}

/**
 * Build the "Dati di Sistema" block injected into the Claude prompt when
 * a matching spedizione is found.
 */
export function buildSystemDataBlock(spedizione: Spedizione): string {
  const lines: string[] = [
    '╔══════════════════════════════════════════════════╗',
    '║           DATI DI SISTEMA — SPEDIZIONE           ║',
    '╚══════════════════════════════════════════════════╝',
    `Numero Spedizione : ${spedizione.numero}`,
    `Stato             : ${spedizione.stato}`,
  ]

  if (spedizione.posizione_attuale) {
    lines.push(`Posizione Attuale : ${spedizione.posizione_attuale}`)
  }
  if (spedizione.data_prevista_consegna) {
    const formatted = new Intl.DateTimeFormat('it-IT', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Europe/Rome',
    }).format(new Date(spedizione.data_prevista_consegna))
    lines.push(`Consegna Prevista : ${formatted}`)
  }
  if (spedizione.nome_autista) {
    lines.push(`Autista           : ${spedizione.nome_autista}`)
  }
  if (spedizione.targa) {
    lines.push(`Targa Automezzo   : ${spedizione.targa}`)
  }
  if (spedizione.mittente) {
    lines.push(`Mittente          : ${spedizione.mittente}`)
  }
  if (spedizione.destinatario) {
    lines.push(`Destinatario      : ${spedizione.destinatario}`)
  }
  if (spedizione.indirizzo_destinazione) {
    lines.push(`Indirizzo Consegna: ${spedizione.indirizzo_destinazione}`)
  }
  if (spedizione.note) {
    lines.push(`Note Operative    : ${spedizione.note}`)
  }

  lines.push(
    '══════════════════════════════════════════════════',
    '',
    'ISTRUZIONE TASSATIVA: integra nella risposta i dati di sistema sopra riportati.',
    `Cita esplicitamente: il numero ${spedizione.numero}, lo stato attuale, la posizione,` +
      (spedizione.data_prevista_consegna ? ' la data e ora prevista di consegna,' : '') +
      (spedizione.nome_autista ? ` il nome dell'autista ${spedizione.nome_autista}` : '') +
      (spedizione.targa ? ` e la targa ${spedizione.targa}` : '') +
      '.',
    'Non inventare dati aggiuntivi oltre a quelli forniti.',
  )

  return lines.join('\n')
}

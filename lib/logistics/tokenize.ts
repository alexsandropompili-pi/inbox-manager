/**
 * Logistics Token system
 *
 * Sends a message to Claude (claude-opus-4-6) which:
 *   1. Extracts three key notions and assigns a category code
 *   2. Classifies the message into one of three sectors (Traffico / Magazzino / Amministrazione)
 *   3. Extracts structured logistics data (targhe, spedizioni, date consegna, quantità, prodotti)
 *
 * Token code format: YYYY-CAT-NNN (e.g. 2026-TRA-001)
 *
 * Category codes:
 *   TRA — Trasporto / Spedizione
 *   FAT — Fatturazione / Pagamento
 *   SUP — Supporto tecnico
 *   COM — Commerciale / Vendite
 *   AMM — Amministrativo / Contratti
 *   GEN — Generale / Altro
 *
 * Sectors:
 *   Traffico      — gestione veicoli, autisti, percorsi, consegne
 *   Magazzino     — stoccaggio, carico/scarico, inventario, scorte
 *   Amministrazione — fatture, pagamenti, contratti, pratiche amministrative
 */

import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/service'
import type { MessageSettore, DatiEstratti } from '@/types/database'

export type CategoryCode = 'TRA' | 'FAT' | 'SUP' | 'COM' | 'AMM' | 'GEN'
export type { MessageSettore }

export interface LogisticsToken {
  token_code: string
  notion_1: string
  notion_2: string
  notion_3: string
  settore: MessageSettore
  dati_estratti: DatiEstratti
}

// ─── Tool definition (stable — will be prompt-cached) ─────────────────────────

const EXTRACT_TOOL: Anthropic.Tool = {
  name: 'generate_logistics_token',
  description:
    'Estrae le 3 nozioni principali di un messaggio logistico, lo categorizza e ne classifica il settore aziendale. ' +
    'Estrae inoltre dati strutturati presenti nel testo (targhe, spedizioni, date, quantità, prodotti). ' +
    'Restituisce tutti i campi in italiano, concisi (nozioni max 60 caratteri ciascuna).',
  input_schema: {
    type: 'object' as const,
    properties: {
      category_code: {
        type: 'string',
        enum: ['TRA', 'FAT', 'SUP', 'COM', 'AMM', 'GEN'],
        description:
          'Codice categoria: TRA=trasporto/spedizione, FAT=fatturazione/pagamento, ' +
          'SUP=supporto tecnico, COM=commerciale/vendite, AMM=amministrativo/contratti, GEN=generale',
      },
      settore: {
        type: 'string',
        enum: ['Traffico', 'Magazzino', 'Amministrazione'],
        description:
          'Settore aziendale: ' +
          'Traffico=gestione veicoli/autisti/percorsi/consegne stradali, ' +
          'Magazzino=stoccaggio/carico-scarico/inventario/scorte, ' +
          'Amministrazione=fatture/pagamenti/contratti/pratiche amministrative',
      },
      notion_1: {
        type: 'string',
        description: 'Tipo di richiesta (es. "Richiesta preventivo enterprise")',
      },
      notion_2: {
        type: 'string',
        description: 'Livello di urgenza o priorità (es. "Urgente - blocca produzione")',
      },
      notion_3: {
        type: 'string',
        description: 'Entità o soggetto principale (es. "TechCorp - 50 utenti")',
      },
      dati_estratti: {
        type: 'object',
        description: 'Dati strutturati estratti dal testo del messaggio. Includi solo i campi con valori presenti.',
        properties: {
          targhe: {
            type: 'array',
            items: { type: 'string' },
            description: 'Targhe di veicoli trovate nel testo (es. ["AB123CD", "EF456GH"])',
          },
          numeri_spedizione: {
            type: 'array',
            items: { type: 'string' },
            description: 'Codici o numeri di spedizione/bolla/tracking trovati nel testo',
          },
          date_consegna: {
            type: 'array',
            items: { type: 'string' },
            description: 'Date di consegna o ritiro nel formato ISO 8601 (YYYY-MM-DD)',
          },
          quantita: {
            type: 'array',
            description: 'Quantità di prodotti o merci menzionate',
            items: {
              type: 'object',
              properties: {
                prodotto: { type: 'string', description: 'Nome o descrizione del prodotto/merce' },
                valore: { type: 'number', description: 'Quantità numerica' },
                unita: { type: 'string', description: 'Unità di misura (pz, kg, pallet, colli, ecc.)' },
              },
              required: ['prodotto', 'valore', 'unita'],
            },
          },
          prodotti: {
            type: 'array',
            items: { type: 'string' },
            description: 'Nomi di prodotti o merci citati nel messaggio',
          },
        },
        additionalProperties: true,
      },
    },
    required: ['category_code', 'settore', 'notion_1', 'notion_2', 'notion_3', 'dati_estratti'],
  },
}

// ─── Helper: next sequential NNN for a given YYYY-CAT prefix ──────────────────

async function nextSequenceNumber(year: number, category: CategoryCode): Promise<number> {
  const db = createServiceClient()
  const prefix = `${year}-${category}-%`

  const { count, error } = await db
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .like('token_code', prefix)

  if (error) throw new Error(`[tokenize] count error: ${error.message}`)
  return (count ?? 0) + 1
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function tokenizeMessage(params: {
  subject: string
  body: string
  from_name: string | null
  from_email: string
}): Promise<LogisticsToken> {
  const client = new Anthropic()
  const year = new Date().getFullYear()

  const userContent =
    `Mittente: ${params.from_name ? `${params.from_name} <${params.from_email}>` : params.from_email}\n` +
    `Oggetto: ${params.subject}\n` +
    `Corpo:\n${params.body.slice(0, 2000)}`

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text:
          'Sei un assistente di classificazione messaggi per una piattaforma logistica aziendale. ' +
          'Analizza il messaggio fornito, estraendo le 3 nozioni principali, il codice categoria, il settore aziendale ' +
          'e tutti i dati strutturati presenti (targhe, spedizioni, date, quantità, prodotti). ' +
          'Rispondi SEMPRE usando il tool generate_logistics_token. ' +
          'Le nozioni devono essere in italiano, concise e significative per un operatore logistico.',
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        ...EXTRACT_TOOL,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tool_choice: { type: 'tool', name: 'generate_logistics_token' },
    messages: [
      {
        role: 'user',
        content: userContent,
      },
    ],
  })

  const toolBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
  if (!toolBlock) {
    throw new Error('[tokenize] Claude did not return a tool_use block')
  }

  const input = toolBlock.input as {
    category_code: CategoryCode
    settore: MessageSettore
    notion_1: string
    notion_2: string
    notion_3: string
    dati_estratti: DatiEstratti
  }

  const seq = await nextSequenceNumber(year, input.category_code)
  const token_code = `${year}-${input.category_code}-${String(seq).padStart(3, '0')}`

  return {
    token_code,
    notion_1: input.notion_1,
    notion_2: input.notion_2,
    notion_3: input.notion_3,
    settore: input.settore,
    dati_estratti: input.dati_estratti ?? {},
  }
}

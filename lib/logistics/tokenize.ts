/**
 * Logistics Token system
 *
 * Sends a message to Claude (claude-opus-4-6) which extracts three key notions
 * and assigns a category code. We then generate a sequential unique token code
 * in the format YYYY-CAT-NNN (e.g. 2026-TRA-001) and return the full token data.
 *
 * Category codes:
 *   TRA — Trasporto / Spedizione
 *   FAT — Fatturazione / Pagamento
 *   SUP — Supporto tecnico
 *   COM — Commerciale / Vendite
 *   AMM — Amministrativo / Contratti
 *   GEN — Generale / Altro
 */

import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/service'

export type CategoryCode = 'TRA' | 'FAT' | 'SUP' | 'COM' | 'AMM' | 'GEN'

export interface LogisticsToken {
  token_code: string
  notion_1: string
  notion_2: string
  notion_3: string
}

// ─── Tool definition (stable — will be prompt-cached) ─────────────────────────

const EXTRACT_TOOL: Anthropic.Tool = {
  name: 'generate_logistics_token',
  description:
    'Estrae le 3 nozioni principali di un messaggio e lo categorizza automaticamente. ' +
    'Restituisce la categoria e le 3 nozioni in italiano, concise (max 60 caratteri ciascuna).',
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
    },
    required: ['category_code', 'notion_1', 'notion_2', 'notion_3'],
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

  // Build the user message text
  const userContent =
    `Mittente: ${params.from_name ? `${params.from_name} <${params.from_email}>` : params.from_email}\n` +
    `Oggetto: ${params.subject}\n` +
    `Corpo:\n${params.body.slice(0, 2000)}`

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    system: [
      {
        type: 'text',
        text:
          'Sei un assistente di classificazione messaggi per una piattaforma di gestione inbox aziendale. ' +
          'Analizza il messaggio fornito ed estrai le 3 nozioni principali, classificando il messaggio nella categoria più appropriata. ' +
          'Rispondi SEMPRE usando il tool generate_logistics_token. ' +
          'Le nozioni devono essere in italiano, concise e significative per un operatore.',
        // Cache the stable system prompt
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        ...EXTRACT_TOOL,
        // Cache the stable tool definition
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

  // Extract tool_use block
  const toolBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
  if (!toolBlock) {
    throw new Error('[tokenize] Claude did not return a tool_use block')
  }

  const input = toolBlock.input as {
    category_code: CategoryCode
    notion_1: string
    notion_2: string
    notion_3: string
  }

  const seq = await nextSequenceNumber(year, input.category_code)
  const token_code = `${year}-${input.category_code}-${String(seq).padStart(3, '0')}`

  return {
    token_code,
    notion_1: input.notion_1,
    notion_2: input.notion_2,
    notion_3: input.notion_3,
  }
}

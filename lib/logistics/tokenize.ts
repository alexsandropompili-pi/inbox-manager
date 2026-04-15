/**
 * Logistics Token system
 *
 * Exports two public functions:
 *
 *   tokenizeMessage   — full pipeline: notions + category code + settore + dati_estratti.
 *                       Called at ingest time for new messages.
 *
 *   extractDatiEstratti — lightweight extraction of only the structured dati_estratti fields.
 *                         Used by the backfill script to update existing messages without
 *                         regenerating token codes or notions.
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
 *   Traffico        — gestione veicoli, autisti, percorsi, consegne
 *   Magazzino       — stoccaggio, carico/scarico, inventario, scorte
 *   Amministrazione — fatture, pagamenti, contratti, pratiche amministrative
 *
 * dati_estratti fields:
 *   numero_spedizione        — codice alfanumerico spedizione/tracking
 *   targa_automezzo          — targa italiana (es. AB123CD)
 *   tipo_documento           — CMR | DDT | Fattura | Bolla | Ordine
 *   punti_di_carico_scarico  — { partenza, destinazione }
 *   grado_urgenza            — bassa | media | alta | critica
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

// ─── Shared dati_estratti schema (reused in both tools) ───────────────────────

const DATI_ESTRATTI_SCHEMA = {
  type: 'object' as const,
  description:
    'Dati strutturati estratti dal testo del messaggio. ' +
    'Tutti i campi devono essere presenti; usa null per quelli non trovati.',
  properties: {
    numero_spedizione: {
      anyOf: [{ type: 'string' as const }, { type: 'null' as const }],
      description:
        'Numero o codice spedizione alfanumerico (lettere + cifre, es. "SPD-001", "12345ABC", "GLS00123456"). ' +
        'null se non presente nel testo.',
    },
    targa_automezzo: {
      anyOf: [{ type: 'string' as const }, { type: 'null' as const }],
      description:
        'Targa del veicolo in formato italiano (es. "AB123CD", "AA000BB"). ' +
        'Restituisci sempre in maiuscolo senza spazi. null se non presente.',
    },
    tipo_documento: {
      anyOf: [
        { type: 'string' as const, enum: ['CMR', 'DDT', 'Fattura', 'Bolla', 'Ordine'] as const },
        { type: 'null' as const },
      ],
      description:
        'Tipo di documento logistico menzionato nel testo: ' +
        'CMR=lettera di vettura internazionale, DDT=documento di trasporto, ' +
        'Fattura=fattura commerciale, Bolla=bolla di consegna/accompagnamento, ' +
        'Ordine=ordine di acquisto/vendita. null se nessun documento è menzionato.',
    },
    punti_di_carico_scarico: {
      anyOf: [
        {
          type: 'object' as const,
          properties: {
            partenza: {
              anyOf: [{ type: 'string' as const }, { type: 'null' as const }],
              description: 'Luogo di partenza/carico (città, indirizzo o magazzino). null se non specificato.',
            },
            destinazione: {
              anyOf: [{ type: 'string' as const }, { type: 'null' as const }],
              description: 'Luogo di destinazione/scarico (città, indirizzo o magazzino). null se non specificato.',
            },
          },
          required: ['partenza', 'destinazione'],
        },
        { type: 'null' as const },
      ],
      description:
        'Luoghi di partenza e destinazione menzionati nel messaggio. ' +
        'null se non sono citati luoghi di carico/scarico.',
    },
    grado_urgenza: {
      type: 'string' as const,
      enum: ['bassa', 'media', 'alta', 'critica'] as const,
      description:
        'Grado di urgenza dedotto dal tono e dalle parole chiave: ' +
        'critica=veicolo/impianto fermo, penale attiva, blocco operativo immediato; ' +
        'alta=ritardo già in corso, cliente in attesa, urgente esplicito; ' +
        'media=richiesta con scadenza prossima o tono sollecitatorio; ' +
        'bassa=richiesta ordinaria senza segnali di urgenza.',
    },
  },
  required: [
    'numero_spedizione',
    'targa_automezzo',
    'tipo_documento',
    'punti_di_carico_scarico',
    'grado_urgenza',
  ],
}

// ─── Tool: full tokenization (notions + category + settore + dati_estratti) ───

const TOKENIZE_TOOL: Anthropic.Tool = {
  name: 'generate_logistics_token',
  description:
    'Classifica un messaggio logistico: assegna categoria, settore aziendale, ' +
    'estrae le 3 nozioni chiave e tutti i dati strutturati.',
  input_schema: {
    type: 'object' as const,
    properties: {
      category_code: {
        type: 'string' as const,
        enum: ['TRA', 'FAT', 'SUP', 'COM', 'AMM', 'GEN'] as const,
        description:
          'Codice categoria: TRA=trasporto/spedizione, FAT=fatturazione/pagamento, ' +
          'SUP=supporto tecnico, COM=commerciale/vendite, AMM=amministrativo/contratti, GEN=generale',
      },
      settore: {
        type: 'string' as const,
        enum: ['Traffico', 'Magazzino', 'Amministrazione'] as const,
        description:
          'Settore aziendale: ' +
          'Traffico=gestione veicoli/autisti/percorsi/consegne stradali, ' +
          'Magazzino=stoccaggio/carico-scarico/inventario/scorte, ' +
          'Amministrazione=fatture/pagamenti/contratti/pratiche amministrative',
      },
      notion_1: {
        type: 'string' as const,
        description: 'Tipo di richiesta (es. "Segnalazione mancata consegna")',
      },
      notion_2: {
        type: 'string' as const,
        description: 'Livello di urgenza o priorità (es. "Urgente - cliente fermo")',
      },
      notion_3: {
        type: 'string' as const,
        description: 'Entità o soggetto principale (es. "Corriere XYZ - spedizione n. 123")',
      },
      dati_estratti: DATI_ESTRATTI_SCHEMA,
    },
    required: ['category_code', 'settore', 'notion_1', 'notion_2', 'notion_3', 'dati_estratti'],
  },
}

// ─── Tool: lightweight data extraction only ───────────────────────────────────

const EXTRACT_DATA_TOOL: Anthropic.Tool = {
  name: 'extract_logistics_data',
  description:
    'Estrae dati strutturati logistici da un messaggio: numero spedizione, targa, ' +
    'tipo documento, luoghi di carico/scarico e grado di urgenza.',
  input_schema: {
    type: 'object' as const,
    properties: {
      dati_estratti: DATI_ESTRATTI_SCHEMA,
    },
    required: ['dati_estratti'],
  },
}

// ─── System prompt (shared, cached) ──────────────────────────────────────────

const SYSTEM_TEXT =
  'Sei un assistente specializzato in logistica e trasporti merci. ' +
  'Analizza messaggi email aziendali ed estrai con precisione i dati operativi rilevanti. ' +
  'Per le targhe usa sempre il formato italiano maiuscolo senza spazi (es. AB123CD). ' +
  'Per il grado di urgenza analizza attentamente parole come: ' +
  '"fermo", "bloccato", "penale", "urgente", "ritardo", "scadenza", "sollecito". ' +
  'Rispondi SEMPRE usando esclusivamente il tool fornito.'

// ─── Helper: next sequential NNN for a given YYYY-CAT prefix ──────────────────

async function nextSequenceNumber(year: number, category: CategoryCode): Promise<number> {
  const db = createServiceClient()

  const { count, error } = await db
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .like('token_code', `${year}-${category}-%`)

  if (error) throw new Error(`[tokenize] count error: ${error.message}`)
  return (count ?? 0) + 1
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUserContent(params: {
  subject: string
  body: string
  from_name: string | null
  from_email: string
}): string {
  return (
    `Mittente: ${params.from_name ? `${params.from_name} <${params.from_email}>` : params.from_email}\n` +
    `Oggetto: ${params.subject}\n` +
    `Corpo:\n${params.body.slice(0, 2000)}`
  )
}

function normalizeDatiEstratti(raw: Record<string, unknown>): DatiEstratti {
  const punti = raw.punti_di_carico_scarico as Record<string, unknown> | null | undefined
  return {
    numero_spedizione: (raw.numero_spedizione as string | null) ?? null,
    targa_automezzo: (raw.targa_automezzo as string | null) ?? null,
    tipo_documento: (raw.tipo_documento as DatiEstratti['tipo_documento']) ?? null,
    punti_di_carico_scarico: punti
      ? {
          partenza: (punti.partenza as string | null) ?? null,
          destinazione: (punti.destinazione as string | null) ?? null,
        }
      : null,
    grado_urgenza: (raw.grado_urgenza as DatiEstratti['grado_urgenza']) ?? 'bassa',
  }
}

// ─── Public: full tokenization ────────────────────────────────────────────────

export async function tokenizeMessage(params: {
  subject: string
  body: string
  from_name: string | null
  from_email: string
}): Promise<LogisticsToken> {
  const client = new Anthropic()
  const year = new Date().getFullYear()

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: [{ type: 'text', text: SYSTEM_TEXT, cache_control: { type: 'ephemeral' } }],
    tools: [{ ...TOKENIZE_TOOL, cache_control: { type: 'ephemeral' } }],
    tool_choice: { type: 'tool', name: 'generate_logistics_token' },
    messages: [{ role: 'user', content: buildUserContent(params) }],
  })

  const toolBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
  if (!toolBlock) throw new Error('[tokenize] Claude did not return a tool_use block')

  const input = toolBlock.input as {
    category_code: CategoryCode
    settore: MessageSettore
    notion_1: string
    notion_2: string
    notion_3: string
    dati_estratti: Record<string, unknown>
  }

  const seq = await nextSequenceNumber(year, input.category_code)
  const token_code = `${year}-${input.category_code}-${String(seq).padStart(3, '0')}`

  return {
    token_code,
    notion_1: input.notion_1,
    notion_2: input.notion_2,
    notion_3: input.notion_3,
    settore: input.settore,
    dati_estratti: normalizeDatiEstratti(input.dati_estratti ?? {}),
  }
}

// ─── Public: lightweight data extraction only ────────────────────────────────

export async function extractDatiEstratti(params: {
  subject: string
  body: string
  from_name: string | null
  from_email: string
}): Promise<DatiEstratti> {
  const client = new Anthropic()

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    system: [{ type: 'text', text: SYSTEM_TEXT, cache_control: { type: 'ephemeral' } }],
    tools: [{ ...EXTRACT_DATA_TOOL, cache_control: { type: 'ephemeral' } }],
    tool_choice: { type: 'tool', name: 'extract_logistics_data' },
    messages: [{ role: 'user', content: buildUserContent(params) }],
  })

  const toolBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
  if (!toolBlock) throw new Error('[extractDatiEstratti] Claude did not return a tool_use block')

  const input = toolBlock.input as { dati_estratti: Record<string, unknown> }
  return normalizeDatiEstratti(input.dati_estratti ?? {})
}

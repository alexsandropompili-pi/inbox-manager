/**
 * Backfill Logistics Tokens — two modes selectable via CLI flag
 *
 *   --full      (default) Processes messages where token_code IS NULL or settore IS NULL:
 *               calls Claude for full tokenization (token code + notions + settore + dati_estratti).
 *
 *   --data-only Processes ALL messages that already have a token_code:
 *               re-extracts only dati_estratti with the current schema without touching
 *               token codes, notions, or settore. Use this after a schema change.
 *
 * Usage:
 *   node --experimental-strip-types --env-file=.env.local scripts/backfill-tokens.ts
 *   node --experimental-strip-types --env-file=.env.local scripts/backfill-tokens.ts --data-only
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// ─── Config ───────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anthropicKey = process.env.ANTHROPIC_API_KEY

if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
if (!anthropicKey) throw new Error('Missing ANTHROPIC_API_KEY')

const db = createClient(supabaseUrl, serviceRoleKey)
const anthropic = new Anthropic({ apiKey: anthropicKey })

const DATA_ONLY = process.argv.includes('--data-only')

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryCode = 'TRA' | 'FAT' | 'SUP' | 'COM' | 'AMM' | 'GEN'
type MessageSettore = 'Traffico' | 'Magazzino' | 'Amministrazione'
type GradoUrgenza = 'bassa' | 'media' | 'alta' | 'critica'
type TipoDocumento = 'CMR' | 'DDT' | 'Fattura' | 'Bolla' | 'Ordine'

interface DatiEstratti {
  numero_spedizione: string | null
  targa_automezzo: string | null
  tipo_documento: TipoDocumento | null
  punti_di_carico_scarico: { partenza: string | null; destinazione: string | null } | null
  grado_urgenza: GradoUrgenza
}

interface Message {
  id: string
  subject: string
  body: string
  from_name: string | null
  from_email: string
}

// ─── Shared tool schemas ──────────────────────────────────────────────────────

const DATI_ESTRATTI_SCHEMA = {
  type: 'object' as const,
  description:
    'Dati strutturati estratti dal testo del messaggio. ' +
    'Tutti i campi devono essere presenti; usa null per quelli non trovati.',
  properties: {
    numero_spedizione: {
      anyOf: [{ type: 'string' as const }, { type: 'null' as const }],
      description:
        'Numero o codice spedizione alfanumerico (lettere + cifre, es. "SPD-001", "12345ABC"). ' +
        'null se non presente nel testo.',
    },
    targa_automezzo: {
      anyOf: [{ type: 'string' as const }, { type: 'null' as const }],
      description:
        'Targa del veicolo in formato italiano (es. "AB123CD"). ' +
        'Restituisci sempre in maiuscolo senza spazi. null se non presente.',
    },
    tipo_documento: {
      anyOf: [
        { type: 'string' as const, enum: ['CMR', 'DDT', 'Fattura', 'Bolla', 'Ordine'] as const },
        { type: 'null' as const },
      ],
      description:
        'Tipo di documento logistico menzionato: ' +
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
              description: 'Luogo di partenza/carico. null se non specificato.',
            },
            destinazione: {
              anyOf: [{ type: 'string' as const }, { type: 'null' as const }],
              description: 'Luogo di destinazione/scarico. null se non specificato.',
            },
          },
          required: ['partenza', 'destinazione'],
        },
        { type: 'null' as const },
      ],
      description: 'Luoghi di carico e scarico. null se non citati.',
    },
    grado_urgenza: {
      type: 'string' as const,
      enum: ['bassa', 'media', 'alta', 'critica'] as const,
      description:
        'Grado di urgenza: ' +
        'critica=fermo/penale/blocco immediato; ' +
        'alta=ritardo in corso, urgente esplicito; ' +
        'media=scadenza prossima, tono sollecitatorio; ' +
        'bassa=richiesta ordinaria.',
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

const TOKENIZE_TOOL: Anthropic.Tool = {
  name: 'generate_logistics_token',
  description: 'Classifica un messaggio logistico: categoria, settore, 3 nozioni e dati strutturati.',
  input_schema: {
    type: 'object' as const,
    properties: {
      category_code: {
        type: 'string' as const,
        enum: ['TRA', 'FAT', 'SUP', 'COM', 'AMM', 'GEN'] as const,
        description:
          'TRA=trasporto/spedizione, FAT=fatturazione/pagamento, ' +
          'SUP=supporto tecnico, COM=commerciale/vendite, AMM=amministrativo/contratti, GEN=generale',
      },
      settore: {
        type: 'string' as const,
        enum: ['Traffico', 'Magazzino', 'Amministrazione'] as const,
        description:
          'Traffico=veicoli/autisti/consegne, Magazzino=stoccaggio/inventario, Amministrazione=fatture/contratti',
      },
      notion_1: { type: 'string' as const, description: 'Tipo di richiesta' },
      notion_2: { type: 'string' as const, description: 'Urgenza o priorità' },
      notion_3: { type: 'string' as const, description: 'Entità o soggetto principale' },
      dati_estratti: DATI_ESTRATTI_SCHEMA,
    },
    required: ['category_code', 'settore', 'notion_1', 'notion_2', 'notion_3', 'dati_estratti'],
  },
}

const EXTRACT_DATA_TOOL: Anthropic.Tool = {
  name: 'extract_logistics_data',
  description: 'Estrae dati strutturati logistici da un messaggio email.',
  input_schema: {
    type: 'object' as const,
    properties: { dati_estratti: DATI_ESTRATTI_SCHEMA },
    required: ['dati_estratti'],
  },
}

const SYSTEM_TEXT =
  'Sei un assistente specializzato in logistica e trasporti merci. ' +
  'Analizza messaggi email aziendali ed estrai con precisione i dati operativi rilevanti. ' +
  'Per le targhe usa sempre il formato italiano maiuscolo senza spazi (es. AB123CD). ' +
  'Per il grado di urgenza analizza attentamente parole come: ' +
  '"fermo", "bloccato", "penale", "urgente", "ritardo", "scadenza", "sollecito". ' +
  'Rispondi SEMPRE usando esclusivamente il tool fornito.'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUserContent(msg: Message): string {
  return (
    `Mittente: ${msg.from_name ? `${msg.from_name} <${msg.from_email}>` : msg.from_email}\n` +
    `Oggetto: ${msg.subject}\n` +
    `Corpo:\n${msg.body.slice(0, 2000)}`
  )
}

function normalizeDatiEstratti(raw: Record<string, unknown>): DatiEstratti {
  const punti = raw.punti_di_carico_scarico as Record<string, unknown> | null | undefined
  return {
    numero_spedizione: (raw.numero_spedizione as string | null) ?? null,
    targa_automezzo: (raw.targa_automezzo as string | null) ?? null,
    tipo_documento: (raw.tipo_documento as TipoDocumento | null) ?? null,
    punti_di_carico_scarico: punti
      ? {
          partenza: (punti.partenza as string | null) ?? null,
          destinazione: (punti.destinazione as string | null) ?? null,
        }
      : null,
    grado_urgenza: (raw.grado_urgenza as GradoUrgenza) ?? 'bassa',
  }
}

async function nextSequenceNumber(year: number, category: CategoryCode): Promise<number> {
  const { count, error } = await db
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .like('token_code', `${year}-${category}-%`)

  if (error) throw new Error(`Count error: ${error.message}`)
  return (count ?? 0) + 1
}

// ─── Mode A: full tokenization ────────────────────────────────────────────────

async function fullTokenize(msg: Message): Promise<{
  token_code: string
  notion_1: string
  notion_2: string
  notion_3: string
  settore: MessageSettore
  dati_estratti: DatiEstratti
}> {
  const year = new Date().getFullYear()

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: [{ type: 'text', text: SYSTEM_TEXT, cache_control: { type: 'ephemeral' } }],
    tools: [{ ...TOKENIZE_TOOL, cache_control: { type: 'ephemeral' } }],
    tool_choice: { type: 'tool', name: 'generate_logistics_token' },
    messages: [{ role: 'user', content: buildUserContent(msg) }],
  })

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
  )
  if (!toolBlock) throw new Error('No tool_use block in response')

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

// ─── Mode B: extract dati_estratti only ──────────────────────────────────────

async function extractData(msg: Message): Promise<DatiEstratti> {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    system: [{ type: 'text', text: SYSTEM_TEXT, cache_control: { type: 'ephemeral' } }],
    tools: [{ ...EXTRACT_DATA_TOOL, cache_control: { type: 'ephemeral' } }],
    tool_choice: { type: 'tool', name: 'extract_logistics_data' },
    messages: [{ role: 'user', content: buildUserContent(msg) }],
  })

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
  )
  if (!toolBlock) throw new Error('No tool_use block in response')

  const input = toolBlock.input as { dati_estratti: Record<string, unknown> }
  return normalizeDatiEstratti(input.dati_estratti ?? {})
}

// ─── Log helpers ──────────────────────────────────────────────────────────────

function logDatiEstratti(d: DatiEstratti): string {
  const parts: string[] = []
  if (d.numero_spedizione) parts.push(`spedizione:${d.numero_spedizione}`)
  if (d.targa_automezzo) parts.push(`targa:${d.targa_automezzo}`)
  if (d.tipo_documento) parts.push(`doc:${d.tipo_documento}`)
  if (d.punti_di_carico_scarico?.partenza) parts.push(`da:${d.punti_di_carico_scarico.partenza}`)
  if (d.punti_di_carico_scarico?.destinazione) parts.push(`a:${d.punti_di_carico_scarico.destinazione}`)
  parts.push(`urgenza:${d.grado_urgenza}`)
  return parts.join(' | ')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DATA_ONLY) {
    console.log('Mode: --data-only (re-extract dati_estratti for all tokenized messages)\n')

    const { data: messages, error } = await db
      .from('messages')
      .select('id, subject, body, from_name, from_email')
      .not('token_code', 'is', null)
      .order('received_at', { ascending: true })

    if (error) throw new Error(`Failed to fetch messages: ${error.message}`)
    if (!messages || messages.length === 0) {
      console.log('No tokenized messages found.')
      return
    }

    console.log(`Found ${messages.length} message(s) to re-process.\n`)
    let success = 0, failed = 0

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i] as Message
      const prefix = `[${i + 1}/${messages.length}]`
      console.log(`${prefix} "${msg.subject}" (${msg.id})`)

      try {
        const dati_estratti = await extractData(msg)
        const { error: updateError } = await db
          .from('messages')
          .update({ dati_estratti })
          .eq('id', msg.id)

        if (updateError) throw new Error(updateError.message)
        console.log(`${prefix} ✓ ${logDatiEstratti(dati_estratti)}`)
        success++
      } catch (err) {
        console.error(`${prefix} ✗ ${(err as Error).message}`)
        failed++
      }

      if (i < messages.length - 1) await new Promise((r) => setTimeout(r, 400))
    }

    console.log(`\nDone. ${success} succeeded, ${failed} failed.`)
    return
  }

  // ── Default: full tokenization for untokenized messages ───────────────────
  console.log('Mode: --full (tokenize messages missing token_code or settore)\n')

  const { data: messages, error } = await db
    .from('messages')
    .select('id, subject, body, from_name, from_email')
    .or('token_code.is.null,settore.is.null')
    .order('received_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch messages: ${error.message}`)
  if (!messages || messages.length === 0) {
    console.log('No messages require full tokenization.')
    return
  }

  console.log(`Found ${messages.length} message(s) to process.\n`)
  let success = 0, failed = 0

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i] as Message
    const prefix = `[${i + 1}/${messages.length}]`
    console.log(`${prefix} "${msg.subject}" (${msg.id})`)

    try {
      const tokenData = await fullTokenize(msg)
      const { error: updateError } = await db
        .from('messages')
        .update(tokenData)
        .eq('id', msg.id)

      if (updateError) throw new Error(updateError.message)
      console.log(
        `${prefix} ✓ ${tokenData.token_code} [${tokenData.settore}] — ${tokenData.notion_1}`,
      )
      console.log(`        ${logDatiEstratti(tokenData.dati_estratti)}`)
      success++
    } catch (err) {
      console.error(`${prefix} ✗ ${(err as Error).message}`)
      failed++
    }

    if (i < messages.length - 1) await new Promise((r) => setTimeout(r, 500))
  }

  console.log(`\nDone. ${success} succeeded, ${failed} failed.`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})

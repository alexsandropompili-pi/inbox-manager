/**
 * Backfill Logistics Tokens for existing messages
 *
 * Processes messages where token_code IS NULL or settore IS NULL,
 * calling Claude for each one to extract notions, sector, token code,
 * and structured logistics data, then updates the record.
 *
 * Usage:
 *   node --experimental-strip-types --env-file=.env.local scripts/backfill-tokens.ts
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

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryCode = 'TRA' | 'FAT' | 'SUP' | 'COM' | 'AMM' | 'GEN'
type MessageSettore = 'Traffico' | 'Magazzino' | 'Amministrazione'

interface DatiEstratti {
  targhe?: string[]
  numeri_spedizione?: string[]
  date_consegna?: string[]
  quantita?: Array<{ prodotto: string; valore: number; unita: string }>
  prodotti?: string[]
  [key: string]: unknown
}

interface Message {
  id: string
  subject: string
  body: string
  from_name: string | null
  from_email: string
}

// ─── Tool definition (cached across calls) ────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function nextSequenceNumber(year: number, category: CategoryCode): Promise<number> {
  const { count, error } = await db
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .like('token_code', `${year}-${category}-%`)

  if (error) throw new Error(`Count error: ${error.message}`)
  return (count ?? 0) + 1
}

async function tokenize(msg: Message): Promise<{
  token_code: string
  notion_1: string
  notion_2: string
  notion_3: string
  settore: MessageSettore
  dati_estratti: DatiEstratti
}> {
  const year = new Date().getFullYear()
  const userContent =
    `Mittente: ${msg.from_name ? `${msg.from_name} <${msg.from_email}>` : msg.from_email}\n` +
    `Oggetto: ${msg.subject}\n` +
    `Corpo:\n${msg.body.slice(0, 2000)}`

  const response = await anthropic.messages.create({
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
    tools: [{ ...EXTRACT_TOOL, cache_control: { type: 'ephemeral' } }],
    tool_choice: { type: 'tool', name: 'generate_logistics_token' },
    messages: [{ role: 'user', content: userContent }],
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Fetch messages missing either token_code or settore (covers both new and old records)
  const { data: messages, error } = await db
    .from('messages')
    .select('id, subject, body, from_name, from_email')
    .or('token_code.is.null,settore.is.null')
    .order('received_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch messages: ${error.message}`)
  if (!messages || messages.length === 0) {
    console.log('No messages require backfill. Nothing to do.')
    return
  }

  console.log(`Found ${messages.length} message(s) to process.\n`)

  let success = 0
  let failed = 0

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i] as Message
    const prefix = `[${i + 1}/${messages.length}]`
    console.log(`${prefix} Processing: "${msg.subject}" (${msg.id})`)

    try {
      const tokenData = await tokenize(msg)

      const { error: updateError } = await db
        .from('messages')
        .update(tokenData)
        .eq('id', msg.id)

      if (updateError) throw new Error(updateError.message)

      const extracted = Object.entries(tokenData.dati_estratti)
        .filter(([, v]) => Array.isArray(v) ? v.length > 0 : v != null)
        .map(([k, v]) => `${k}:${Array.isArray(v) ? v.length : 1}`)
        .join(' ')

      console.log(
        `${prefix} ✓ ${tokenData.token_code} [${tokenData.settore}] — ${tokenData.notion_1}` +
        (extracted ? ` (${extracted})` : ''),
      )
      success++
    } catch (err) {
      console.error(`${prefix} ✗ Failed: ${(err as Error).message}`)
      failed++
    }

    if (i < messages.length - 1) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  console.log(`\nDone. ${success} succeeded, ${failed} failed.`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})

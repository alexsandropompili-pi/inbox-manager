import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/service'

const client = new Anthropic()

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'read_pages',
    description:
      'Leggi il contenuto completo di una o più pagine wiki tramite slug. ' +
      'Usa questo tool quando hai già identificato le pagine rilevanti.',
    input_schema: {
      type: 'object' as const,
      properties: {
        slugs: {
          type: 'array' as const,
          items: { type: 'string' as const },
          description: 'Lista di slug da leggere (es. ["tariffe-nord-sud", "procedura-reclami"])',
        },
      },
      required: ['slugs'],
    },
  },
  {
    name: 'search_pages',
    description:
      'Cerca nelle pagine wiki quelle che contengono una parola chiave nel titolo o nel contenuto. ' +
      'Usa questo tool quando non sei sicuro del slug esatto o vuoi trovare pagine per argomento.',
    input_schema: {
      type: 'object' as const,
      properties: {
        keyword: {
          type: 'string' as const,
          description: 'Parola chiave da cercare (es. "Germania", "assicurazione", "reso")',
        },
      },
      required: ['keyword'],
    },
  },
]

// ─── Main export ──────────────────────────────────────────────────────────────

export async function queryWikiContext(
  companyId: string,
  emailSubject: string,
  emailBody: string,
): Promise<string> {
  const db = createServiceClient()

  // Load all wiki pages once — used by both tools (client-side filtering)
  const { data: allPages, error } = await db
    .from('kb_wiki_pages')
    .select('slug, title, content, category')
    .eq('company_id', companyId)
    .eq('page_type', 'page')

  if (error || !allPages?.length) return ''

  // Build page directory shown to the agent on the first turn
  const directory = allPages
    .map((p) => `- ${p.slug}: ${p.title}${p.category ? ` [${p.category}]` : ''}`)
    .join('\n')

  // ── Agent loop ───────────────────────────────────────────────────────────────

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content:
        `EMAIL DA GESTIRE:\n` +
        `Oggetto: ${emailSubject}\n` +
        `${emailBody.slice(0, 1500)}\n\n` +
        `PAGINE WIKI DISPONIBILI:\n${directory}\n\n` +
        `Usa i tool per trovare le pagine rilevanti per rispondere a questa email. ` +
        `Quando hai raccolto tutto il necessario, rispondi con il testo "DONE".`,
    },
  ]

  const collectedPages = new Map<string, string>() // slug → formatted content
  const MAX_ITERATIONS = 5

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:
        'Sei un agente di ricerca sul wiki aziendale. ' +
        'Il tuo unico compito è trovare le pagine wiki utili per rispondere a una email. ' +
        'Usa i tool per cercare e leggere le pagine. ' +
        'Puoi fare più ricerche in sequenza se la prima non basta. ' +
        'Quando hai raccolto abbastanza contesto, rispondi SOLO con "DONE".',
      tools: TOOLS,
      messages,
    })

    // Append assistant turn to history
    messages.push({ role: 'assistant', content: response.content })

    // If Claude said DONE or ran out of tokens, stop
    if (response.stop_reason === 'end_turn') break

    // Process all tool calls in this turn
    const toolCalls = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    )
    if (!toolCalls.length) break

    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const call of toolCalls) {
      let resultText = ''

      if (call.name === 'read_pages') {
        const { slugs } = call.input as { slugs: string[] }
        const found = allPages.filter((p) => slugs.includes(p.slug))
        for (const p of found) {
          collectedPages.set(p.slug, `### ${p.title}\n${p.content}`)
        }
        resultText = found.length
          ? found.map((p) => `✓ ${p.slug} — caricata`).join('\n')
          : 'Nessuna pagina trovata per gli slug indicati.'
      }

      if (call.name === 'search_pages') {
        const { keyword } = call.input as { keyword: string }
        const kw = keyword.toLowerCase()
        const found = allPages.filter(
          (p) =>
            p.title.toLowerCase().includes(kw) ||
            p.content.toLowerCase().includes(kw),
        )
        if (found.length) {
          for (const p of found) {
            collectedPages.set(p.slug, `### ${p.title}\n${p.content}`)
          }
          resultText =
            `Trovate ${found.length} pagine:\n` +
            found.map((p) => `- ${p.slug}: ${p.title}`).join('\n')
        } else {
          resultText = `Nessuna pagina contiene "${keyword}".`
        }
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: call.id,
        content: resultText,
      })
    }

    messages.push({ role: 'user', content: toolResults })
  }

  // ── Build context block ───────────────────────────────────────────────────────

  if (!collectedPages.size) return ''

  const context = [...collectedPages.values()].join('\n\n---\n\n')
  return (
    `DOCUMENTAZIONE AZIENDALE\n` +
    `Usa queste informazioni reali per rispondere. Non inventare dati.\n\n` +
    context
  )
}

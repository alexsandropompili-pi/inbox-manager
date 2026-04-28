import Anthropic from '@anthropic-ai/sdk'
import type { Message, Spedizione } from '@/types/database'
import { buildSystemDataBlock } from '@/lib/logistics/spedizione-lookup'
import { queryWikiContext } from '@/lib/kb/query'

const client = new Anthropic()

export async function POST(request: Request) {
  const { message, spedizione }: { message: Message; spedizione?: Spedizione | null } =
    await request.json()
const wikiContext = await queryWikiContext(
  message.company_id,
  message.subject,
  message.body ?? ''
).catch(() => '')
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        // ── System prompt ──────────────────────────────────────────────────────
        const systemParts: string[] = [
          'Sei un assistente esperto nella gestione delle comunicazioni aziendali in italiano.',
          'Genera risposte professionali, cordiali e pertinenti.',
          'La risposta deve essere pronta per essere inviata direttamente, senza metasegni o placeholder.',
          'Non aggiungere note, istruzioni o commenti — solo il testo della risposta.',
        ]
        if (wikiContext) {
          systemParts.push('')
          systemParts.push(wikiContext)
        }
        if (spedizione) {
          systemParts.push('', buildSystemDataBlock(spedizione))
        }

        const systemPrompt = systemParts.join('\n\n')

        // ── User message ───────────────────────────────────────────────────────
        const userLines: string[] = [
          'Genera una risposta professionale per la seguente email ricevuta:',
          '',
          `Da: ${message.from_name ? `${message.from_name} <${message.from_email}>` : message.from_email}`,
          `A: ${message.to_email}`,
          `Oggetto: ${message.subject}`,
          `Ricevuta: ${new Intl.DateTimeFormat('it-IT', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(message.received_at))}`,
        ]

        if (message.body) {
          userLines.push('', 'Corpo del messaggio:', message.body)
        }

        if (spedizione) {
          userLines.push(
            '',
            `[Il cliente fa riferimento alla spedizione ${spedizione.numero}. ` +
            `Usa i dati di sistema forniti nel system prompt per dare una risposta precisa e aggiornata.]`,
          )
        }

        const stream = client.messages.stream({
          model: 'claude-opus-4-6',
          max_tokens: 16000,
          thinking: { type: 'adaptive' },
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userLines.filter(Boolean).join('\n'),
            },
          ],
        })

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'no-cache, no-transform',
    },
  })
}

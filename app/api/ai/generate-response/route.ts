import Anthropic from '@anthropic-ai/sdk'
import type { Message } from '@/types/database'

const client = new Anthropic()

export async function POST(request: Request) {
  const { message }: { message: Message } = await request.json()

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: 'claude-opus-4-6',
          max_tokens: 16000,
          thinking: { type: 'adaptive' },
          system: [
            'Sei un assistente esperto nella gestione delle comunicazioni aziendali in italiano.',
            'Genera risposte professionali, cordiali e pertinenti.',
            'La risposta deve essere pronta per essere inviata direttamente, senza metasegni o placeholder.',
            'Non aggiungere note, istruzioni o commenti — solo il testo della risposta.',
          ].join(' '),
          messages: [
            {
              role: 'user',
              content: [
                `Genera una risposta professionale per la seguente email ricevuta:`,
                ``,
                `Da: ${message.from_name ? `${message.from_name} <${message.from_email}>` : message.from_email}`,
                `A: ${message.to_email}`,
                `Oggetto: ${message.subject}`,
                `Ricevuta: ${new Intl.DateTimeFormat('it-IT', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(message.received_at))}`,
                message.body ? `\nCorpo del messaggio:\n${message.body}` : '',
              ]
                .filter(Boolean)
                .join('\n'),
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

// lib/kb/ingest.ts
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/service'
import { getAllWikiPages, upsertWikiPage, appendWikiLog } from './wiki-manager'

const client = new Anthropic()

interface IngestResult {
  pagesCreated: number
  pagesUpdated: number
  slugs: string[]
}

export async function ingestDocument(
  companyId: string,
  sourceId: string,
  fileText: string,
  fileName: string
): Promise<IngestResult> {
  const db = createServiceClient()

  await db.from('kb_raw_sources')
    .update({ status: 'processing' }).eq('id', sourceId)

  try {
    const existingPages = await getAllWikiPages(companyId)
    const wikiSummary = existingPages
      .filter(p => p.page_type !== 'schema')
      .map(p => `### ${p.slug}\n${p.content.slice(0, 400)}...`)
      .join('\n\n')

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8000,
      system: `Sei il gestore del wiki aziendale. Il tuo compito è leggere un nuovo documento e aggiornare il wiki aziendale di conseguenza.

REGOLE:
1. Rispondi SOLO con un JSON valido, nessun testo prima o dopo.
2. Il JSON deve avere questa struttura:
{
  "pages": [
    {
      "slug": "slug-in-kebab-case",
      "title": "Titolo della pagina",
      "content": "# Titolo\n\nContenuto Markdown completo...",
      "category": "tariffe|procedure|faq|prodotti|contatti|altro",
      "action": "create|update"
    }
  ],
  "index_update": "Contenuto Markdown aggiornato completo di index.md"
}
3. Crea pagine nuove per ogni concetto chiave nel documento.
4. Aggiorna pagine esistenti se il documento contiene informazioni più recenti.
5. Aggiorna SEMPRE index.md con le nuove/modificate pagine.
6. Usa tabelle Markdown per dati strutturati come prezzi e tariffe.`,
      messages: [{
        role: 'user',
        content: `DOCUMENTO DA ELABORARE: ${fileName}\n\n${fileText}\n\n---\n\nWIKI ESISTENTE:\n${wikiSummary || '(wiki vuoto — prima fonte)'}`,
      }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    let pagesCreated = 0
    let pagesUpdated = 0
    const slugs: string[] = []

    for (const page of result.pages) {
      const existing = existingPages.find(p => p.slug === page.slug)
      await upsertWikiPage(companyId, page.slug, {
        title:      page.title,
        content:    page.content,
        page_type:  'page',
        category:   page.category,
        source_ids: [...(existing?.source_ids ?? []), sourceId],
      })
      if (page.action === 'create') pagesCreated++
      else pagesUpdated++
      slugs.push(page.slug)
      await appendWikiLog(
        companyId,
        page.action === 'create' ? 'create_page' : 'update_page',
        `${page.action === 'create' ? 'Creata' : 'Aggiornata'} pagina "${page.title}"`,
        sourceId,
        page.slug
      )
    }

    if (result.index_update) {
      await upsertWikiPage(companyId, 'index', {
        title:      'Indice Wiki',
        content:    result.index_update,
        page_type:  'index',
        category:   null,
        source_ids: [],
      })
    }

    await db.from('kb_raw_sources').update({
      status:        'done',
      pages_created: pagesCreated,
      pages_updated: pagesUpdated,
      processed_at:  new Date().toISOString(),
    }).eq('id', sourceId)

    await appendWikiLog(
      companyId,
      'ingest',
      `Ingest completato: ${pagesCreated} pagine create, ${pagesUpdated} aggiornate`,
      sourceId
    )

    return { pagesCreated, pagesUpdated, slugs }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await db.from('kb_raw_sources').update({
      status:        'error',
      error_message: message,
      processed_at:  new Date().toISOString(),
    }).eq('id', sourceId)
    throw err
  }
}
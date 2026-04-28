// app/api/kb/process/route.ts
import { NextRequest, NextResponse } from 'next/server'
import pdfParse from 'pdf-parse'
import { createServiceClient } from '@/lib/supabase/service'
import { ingestDocument } from '@/lib/kb/ingest'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.INGEST_SECRET)
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { company_id, source_id } = await req.json()
  if (!company_id)
    return NextResponse.json({ error: 'company_id obbligatorio' }, { status: 400 })

  const db = createServiceClient()

  // Fetch sources to process
  let query = db
    .from('kb_raw_sources')
    .select('*')
    .eq('company_id', company_id)
    .eq('status', 'pending')

  if (source_id) query = query.eq('id', source_id)

  const { data: sources, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!sources?.length)
    return NextResponse.json({ message: 'Nessuna sorgente da elaborare', processed: 0 })

  const SUPPORTED_TYPES = ['txt', 'md', 'csv', 'pdf']

  const results = []
  for (const source of sources) {
    if (!SUPPORTED_TYPES.includes(source.file_type)) {
      const msg = `Tipo file non supportato per l'elaborazione testo: ${source.file_type}`
      await db.from('kb_raw_sources').update({ status: 'error', error_message: msg, processed_at: new Date().toISOString() }).eq('id', source.id)
      results.push({ source_id: source.id, error: msg })
      continue
    }

    const { data: fileData, error: dlError } = await db.storage
      .from('kb-raw')
      .download(source.storage_path)
    if (dlError) {
      await db.from('kb_raw_sources').update({ status: 'error', error_message: dlError.message, processed_at: new Date().toISOString() }).eq('id', source.id)
      results.push({ source_id: source.id, error: dlError.message })
      continue
    }

    try {
      let fileText: string
      if (source.file_type === 'pdf') {
        const buffer = Buffer.from(await fileData.arrayBuffer())
        const parsed = await pdfParse(buffer)
        fileText = parsed.text
      } else {
        fileText = await fileData.text()
      }
      const result = await ingestDocument(company_id, source.id, fileText, source.original_name)
      results.push({ source_id: source.id, ...result })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      results.push({ source_id: source.id, error: message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

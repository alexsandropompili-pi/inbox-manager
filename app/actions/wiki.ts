'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { ingestDocument } from '@/lib/kb/ingest'
import pdfParse from 'pdf-parse'
import type { KbRawSource, KbWikiPage } from '@/types/database'

const COMPANY_ID = process.env.COMPANY_ID ?? 'bf46bcf2-ad9e-4e35-aa0e-a2d350601573'

const ALLOWED_MIME = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export async function getSourcesAction(): Promise<KbRawSource[]> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('kb_raw_sources')
    .select('*')
    .eq('company_id', COMPANY_ID)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getWikiPagesAction(): Promise<KbWikiPage[]> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('kb_wiki_pages')
    .select('*')
    .eq('company_id', COMPANY_ID)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function uploadDocumentAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const file = formData.get('file') as File | null
  if (!file) return { ok: false, error: 'Nessun file selezionato' }
  if (!ALLOWED_MIME.includes(file.type))
    return { ok: false, error: `Formato non supportato: ${file.name}` }

  const db = createServiceClient()
  const ext = file.name.split('.').pop() ?? 'txt'
  const storagePath = `${COMPANY_ID}/${Date.now()}-${crypto.randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await db.storage
    .from('kb-raw')
    .upload(storagePath, buffer, { contentType: file.type })
  if (uploadError) return { ok: false, error: uploadError.message }

  const { error: dbError } = await db.from('kb_raw_sources').insert({
    company_id: COMPANY_ID,
    filename: storagePath,
    original_name: file.name,
    file_type: ext,
    file_size: file.size,
    storage_path: storagePath,
    status: 'pending',
  })
  if (dbError) return { ok: false, error: dbError.message }

  revalidatePath('/wiki')
  return { ok: true }
}

export async function processDocumentAction(
  sourceId: string,
): Promise<{ ok: boolean; error?: string }> {
  const db = createServiceClient()

  const { data: source, error } = await db
    .from('kb_raw_sources')
    .select('*')
    .eq('id', sourceId)
    .eq('company_id', COMPANY_ID)
    .single()
  if (error || !source) return { ok: false, error: 'Sorgente non trovata' }

  const SUPPORTED = ['txt', 'md', 'csv', 'pdf']
  if (!SUPPORTED.includes(source.file_type))
    return { ok: false, error: `Tipo ${source.file_type} non elaborabile` }

  const { data: fileData, error: dlError } = await db.storage
    .from('kb-raw')
    .download(source.storage_path)
  if (dlError) return { ok: false, error: dlError.message }

  let fileText: string
  if (source.file_type === 'pdf') {
    const buffer = Buffer.from(await fileData.arrayBuffer())
    const parsed = await pdfParse(buffer)
    fileText = parsed.text
  } else {
    fileText = await fileData.text()
  }

  await ingestDocument(COMPANY_ID, source.id, fileText, source.original_name)

  revalidatePath('/wiki')
  return { ok: true }
}

export async function deleteSourceAction(sourceId: string): Promise<void> {
  const db = createServiceClient()
  const { data: source } = await db
    .from('kb_raw_sources')
    .select('storage_path')
    .eq('id', sourceId)
    .eq('company_id', COMPANY_ID)
    .single()

  if (source) {
    await db.storage.from('kb-raw').remove([source.storage_path])
    await db.from('kb_raw_sources').delete().eq('id', sourceId)
  }

  revalidatePath('/wiki')
}

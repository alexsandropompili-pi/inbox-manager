// app/api/kb/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.INGEST_SECRET)
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const db = createServiceClient()
  const formData = await req.formData()
  const file      = formData.get('file') as File
  const companyId = formData.get('company_id') as string

  if (!file || !companyId)
    return NextResponse.json({ error: 'file e company_id obbligatori' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: 'Formato non supportato' }, { status: 400 })

  const ext = file.name.split('.').pop()
  const storagePath = `${companyId}/${Date.now()}-${crypto.randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await db.storage
    .from('kb-raw')
    .upload(storagePath, buffer, { contentType: file.type })
  if (uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: source, error: dbError } = await db
    .from('kb_raw_sources')
    .insert({
      company_id:    companyId,
      filename:      storagePath,
      original_name: file.name,
      file_type:     ext ?? 'txt',
      file_size:     file.size,
      storage_path:  storagePath,
      status:        'pending',
    })
    .select().single()
  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ source }, { status: 201 })
}
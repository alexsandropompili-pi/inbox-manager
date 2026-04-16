import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'Email richiesta' }, { status: 400 })

  const admin = createServiceClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: 'Errore server' }, { status: 500 })

  const user = data.users.find(u => u.email === email)
  if (!user) return NextResponse.json({ error: 'Nessun account trovato con questa email' }, { status: 404 })

  const question = user.user_metadata?.security_question as string | undefined
  if (!question)
    return NextResponse.json({ error: 'Domanda di sicurezza non impostata per questo account' }, { status: 404 })

  return NextResponse.json({ question })
}

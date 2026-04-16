import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const body = await req.json() as { email?: string; answer?: string; newPassword?: string }
  const { email, answer, newPassword } = body

  if (!email || !answer || !newPassword)
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  if (newPassword.length < 8)
    return NextResponse.json({ error: 'La password deve essere di almeno 8 caratteri' }, { status: 400 })

  const admin = createServiceClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: 'Errore server' }, { status: 500 })

  const user = data.users.find(u => u.email === email)
  if (!user) return NextResponse.json({ error: 'Nessun account trovato' }, { status: 404 })

  const storedAnswer = user.user_metadata?.security_answer as string | undefined
  if (!storedAnswer || storedAnswer !== answer.toLowerCase().trim())
    return NextResponse.json({ error: 'Risposta non corretta' }, { status: 401 })

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password: newPassword })
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

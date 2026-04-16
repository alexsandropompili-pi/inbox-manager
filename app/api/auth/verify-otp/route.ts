import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    email?: string
    phone?: string
    token?: string
    newPassword?: string
  }
  const { email, phone, token, newPassword } = body

  if (!email || !phone || !token || !newPassword)
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  if (newPassword.length < 8)
    return NextResponse.json({ error: 'La password deve essere di almeno 8 caratteri' }, { status: 400 })

  // Verify OTP with the anon client (creates a phone-based session, discarded after)
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { error: verifyError } = await anonClient.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })
  if (verifyError)
    return NextResponse.json({ error: 'Codice OTP non valido o scaduto' }, { status: 401 })

  // Update the email-based user's password via admin API
  const admin = createServiceClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: 'Errore server' }, { status: 500 })

  const user = data.users.find(u => u.email === email)
  if (!user) return NextResponse.json({ error: 'Nessun account trovato' }, { status: 404 })

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password: newPassword })
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

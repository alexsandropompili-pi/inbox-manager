import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const body = await req.json() as { email?: string; phone?: string }
  const { email, phone } = body

  if (!email || !phone)
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  // Verify phone matches user metadata
  const admin = createServiceClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: 'Errore server' }, { status: 500 })

  const user = data.users.find(u => u.email === email)
  if (!user) return NextResponse.json({ error: 'Nessun account trovato' }, { status: 404 })

  const storedPhone = user.user_metadata?.phone as string | undefined
  if (!storedPhone || storedPhone !== phone)
    return NextResponse.json({ error: 'Numero di telefono non corrispondente' }, { status: 401 })

  // Send OTP via Supabase phone auth
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { error: otpError } = await anonClient.auth.signInWithOtp({ phone })
  if (otpError) return NextResponse.json({ error: otpError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

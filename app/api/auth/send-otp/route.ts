import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const body = await req.json() as { email?: string; method?: 'email' | 'sms' }
  const { email, method } = body

  if (!email || !method)
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // ── Via email ─────────────────────────────────────────────────────────────────
  if (method === 'email') {
    const { error } = await anonClient.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Via SMS ───────────────────────────────────────────────────────────────────
  const admin = createServiceClient()
  const { data, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listError) return NextResponse.json({ error: 'Errore server' }, { status: 500 })

  const user = data.users.find(u => u.email === email)
  if (!user) return NextResponse.json({ error: 'Nessun account trovato' }, { status: 404 })

  const phone = user.user_metadata?.phone as string | undefined
  if (!phone)
    return NextResponse.json(
      { error: 'Nessun numero di telefono associato all\'account' },
      { status: 400 },
    )

  const { error: otpError } = await anonClient.auth.signInWithOtp({ phone })
  if (otpError) return NextResponse.json({ error: otpError.message }, { status: 500 })

  return NextResponse.json({ success: true, phone })
}

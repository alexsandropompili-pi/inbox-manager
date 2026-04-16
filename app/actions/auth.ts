'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const email    = formData.get('email')    as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  // redirect() throws internally — must be outside try/catch
  redirect('/')
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ─── Password reset ───────────────────────────────────────────────────────────

type ResetResult = { error: string } | { success: true }

export async function resetPasswordAction(
  _prevState: ResetResult | null,
  formData: FormData,
): Promise<ResetResult> {
  const email = formData.get('email') as string

  // Build the absolute URL Supabase will redirect to after the user clicks the
  // link in the email. Falls back to VERCEL_URL (set automatically by Vercel)
  // and then to localhost for local development.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  })

  if (error) return { error: error.message }
  return { success: true }
}

// ─── Registration ────────────────────────────────────────────────────────────

type RegisterState = { error: string } | { success: true } | null

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const email             = formData.get('email')             as string
  const password          = formData.get('password')          as string
  const nome              = formData.get('nome')              as string
  const cognome           = formData.get('cognome')           as string
  const phone             = formData.get('phone')             as string
  const security_question = formData.get('security_question') as string
  const security_answer   = (formData.get('security_answer') as string).toLowerCase().trim()

  if (password.length < 8)
    return { error: 'La password deve essere di almeno 8 caratteri.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nome, cognome, phone, security_question, security_answer },
    },
  })

  if (error) return { error: error.message }

  // If Supabase returned a session immediately (email confirmation disabled)
  if (data.session) redirect('/')

  // Otherwise email confirmation is required
  return { success: true }
}

export async function updatePasswordAction(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const password = formData.get('password') as string
  const confirm  = formData.get('confirm')  as string

  if (password !== confirm)
    return { error: 'Le password non corrispondono.' }
  if (password.length < 8)
    return { error: 'La password deve essere di almeno 8 caratteri.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: error.message }

  redirect('/')
}

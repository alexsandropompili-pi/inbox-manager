import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase Auth callback — exchanges the one-time code that Supabase appends
 * to the redirect URL (PKCE flow) for a real session stored in cookies.
 *
 * Used by: email confirmation, password reset, OAuth (future).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — send back to login with a visible error flag.
  return NextResponse.redirect(`${origin}/login?error=link_non_valido`)
}

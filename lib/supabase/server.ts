import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Server-side Supabase client — reads and writes auth tokens via HTTP cookies.
 * Use in Server Components, Server Actions, and Route Handlers.
 * Do NOT use in Client Components (use lib/supabase/client.ts there).
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Drop maxAge and expires so the cookie becomes a session cookie
              // (cleared automatically when the browser is closed).
              const { maxAge: _maxAge, expires: _expires, ...sessionOptions } = options
              cookieStore.set(name, value, sessionOptions)
            })
          } catch {
            // Called from a Server Component — cookies can only be written in
            // Server Actions and Route Handlers. Safe to ignore here.
          }
        },
      },
    },
  )
}

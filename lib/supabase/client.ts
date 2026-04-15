import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Browser-side Supabase client — syncs the session from the cookies set by
 * the server. Use only inside Client Components ('use client').
 *
 * Cookies are written without max-age/expires so they become session cookies
 * and are cleared automatically when the browser is closed.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return []
          return document.cookie.split(';').flatMap((c) => {
            const eq = c.indexOf('=')
            if (eq < 0) return []
            return [{ name: c.slice(0, eq).trim(), value: c.slice(eq + 1).trim() }]
          })
        },
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') return
          cookiesToSet.forEach(({ name, value, options }) => {
            // Omit maxAge and expires — session cookie only (cleared on browser close)
            const parts = [`${name}=${value}`]
            if (options.path)     parts.push(`path=${options.path}`)
            if (options.domain)   parts.push(`domain=${options.domain}`)
            if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
            if (options.secure)   parts.push('Secure')
            // httpOnly cannot be set via document.cookie (server-only attribute)
            document.cookie = parts.join('; ')
          })
        },
      },
    },
  )
}

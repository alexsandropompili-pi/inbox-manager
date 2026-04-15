import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that are accessible without authentication
const PUBLIC_PATHS = ['/login', '/reset-password']

/**
 * Next.js 16 Proxy (replaces middleware.ts).
 * Runs on every non-static request before rendering.
 *
 * - Unauthenticated requests to any protected route → redirect to /login
 * - Authenticated requests to /login or /reset-password → redirect to /
 * - Also refreshes the Supabase session cookie when it's about to expire
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Build a mutable response so Supabase can write refreshed tokens
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write refreshed tokens onto both request and response,
          // stripping maxAge/expires so they remain session-only cookies.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            const { maxAge: _maxAge, expires: _expires, ...sessionOptions } = options
            response.cookies.set(name, value, sessionOptions)
          })
        },
      },
    },
  )

  // Validate the session against Supabase (verifies the JWT server-side)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // Unauthenticated user on a protected route → send to login
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated user on a public route (login/reset) → send to dashboard
  if (user && isPublicPath) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals, static assets, and images
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

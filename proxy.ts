import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js 16 Proxy (formerly middleware).
 * Runs on every request before rendering. Protects the dashboard route and
 * redirects authenticated users away from the login page.
 *
 * Uses an optimistic session check (cookie-only, no DB round-trip) — the
 * Server Component in page.tsx re-validates with supabase.auth.getUser().
 */
export async function proxy(request: NextRequest) {
  // Start with a pass-through response; will be replaced if cookies are refreshed.
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
          // Forward refreshed tokens to both request and response.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getUser() makes a lightweight JWT validation (no DB call).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Unauthenticated user trying to access the dashboard → send to login.
  if (path === '/' && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated user hitting the login page → send to dashboard.
  if (path === '/login' && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets.
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

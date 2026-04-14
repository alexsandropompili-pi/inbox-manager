import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseAnonKey) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY')

// Singleton — safe to import in Server Components, Route Handlers, and Server Actions.
// For browser Client Components, use the same export (the JS SDK handles both environments).
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Use this client for privileged server-only operations (bypasses RLS).
// Keep SUPABASE_SERVICE_ROLE_KEY out of the client bundle — only import from
// server files (Route Handlers / Server Actions / server-only modules).
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY')
  return createClient<Database>(supabaseUrl!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

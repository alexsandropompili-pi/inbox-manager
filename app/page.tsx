import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/app/components/kanban/KanbanBoard'
import type { Message } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Double-check auth (proxy already handles the redirect, but this is a
  // safety net in case a Server Component is rendered without the proxy).
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch messages ordered by most recent first.
  // Supabase RLS policies control which rows each user can see.
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('received_at', { ascending: false })

  if (error) {
    console.error('[DashboardPage] Failed to fetch messages:', error.message)
  }

  const messages = (data ?? []) as Message[]

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50">
      <KanbanBoard initialMessages={messages} userEmail={user.email ?? ''} />
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/app/components/layout/AppShell'
import { KanbanBoard } from '@/app/components/kanban/KanbanBoard'
import type { Message } from '@/types/database'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('received_at', { ascending: false })

  if (error) {
    console.error('[DashboardPage] Failed to fetch messages:', error.message)
  }

  const messages = (data ?? []) as Message[]
  const { mine } = await searchParams
  const myMessagesOnly = mine === '1'

  return (
    <AppShell userEmail={user.email ?? ''}>
      <KanbanBoard
        initialMessages={messages}
        currentUserEmail={user.email ?? ''}
        myMessagesOnly={myMessagesOnly}
      />
    </AppShell>
  )
}

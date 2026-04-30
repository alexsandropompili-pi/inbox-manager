import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { AppShell } from '@/app/components/layout/AppShell'
import { KanbanBoard } from '@/app/components/kanban/KanbanBoard'
import { CategoryDashboard } from '@/app/components/dashboard/CategoryDashboard'
import type { CategoryData } from '@/app/components/dashboard/CategoryDashboard'
import type { Message } from '@/types/database'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data, error } = await db
    .from('messages')
    .select('*')
    .order('received_at', { ascending: false })

  if (error) console.error('[DashboardPage] Failed to fetch messages:', error.message)

  const messages = (data ?? []) as Message[]
  const { category, mine } = await searchParams

  // ── Category view: Kanban filtered by notion_1 ──────────────────────────────
  if (typeof category === 'string' && category) {
    const filtered = messages.filter((m) => m.notion_1 === category)
    return (
      <AppShell userEmail={user.email ?? ''}>
        <KanbanBoard
          initialMessages={filtered}
          currentUserEmail={user.email ?? ''}
          categoryTitle={category}
        />
      </AppShell>
    )
  }

  // ── My messages view ────────────────────────────────────────────────────────
  if (mine === '1') {
    return (
      <AppShell userEmail={user.email ?? ''}>
        <KanbanBoard
          initialMessages={messages}
          currentUserEmail={user.email ?? ''}
          myMessagesOnly
        />
      </AppShell>
    )
  }

  // ── Default: category dashboard ─────────────────────────────────────────────
  const categoryMap = new Map<string, CategoryData>()

  for (const msg of messages) {
    const key = msg.notion_1 ?? 'Non classificato'
    const existing = categoryMap.get(key) ?? { notion: key, count: 0, arrived: 0, in_progress: 0 }
    existing.count++
    if (msg.status === 'arrived') existing.arrived++
    if (msg.status === 'in_progress') existing.in_progress++
    categoryMap.set(key, existing)
  }

  const categories = Array.from(categoryMap.values()).sort((a, b) => b.count - a.count)

  const stats = {
    total: messages.length,
    arrived: messages.filter((m) => m.status === 'arrived').length,
    in_progress: messages.filter((m) => m.status === 'in_progress').length,
    replied: messages.filter((m) => m.status === 'replied').length,
  }

  return (
    <AppShell userEmail={user.email ?? ''}>
      <CategoryDashboard
        categories={categories}
        stats={stats}
        userEmail={user.email ?? ''}
      />
    </AppShell>
  )
}

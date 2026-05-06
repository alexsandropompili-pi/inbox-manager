import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { AppShell } from '@/app/components/layout/AppShell'
import { KanbanBoard } from '@/app/components/kanban/KanbanBoard'
import { CategoryDashboard } from '@/app/components/dashboard/CategoryDashboard'
import type { CategoryData } from '@/app/components/dashboard/CategoryDashboard'
import type { Message } from '@/types/database'

function mapToFixedCategory(notion1: string | null | undefined): string {
  const n = (notion1 ?? '').toLowerCase()
  if (n.includes('reclam') || n.includes('contestaz') || n.includes('lament')) return 'Reclami'
  if (n.includes('fattur') || n.includes('pagament') || n.includes('rimborso')) return 'Fatture'
  if (n.includes('dipendent') || n.includes('ferie') || n.includes('permess') || n.includes('stipend')) return 'Richieste dipendenti'
  if (n.includes('ordin') || n.includes('acquist') || n.includes('forni')) return 'Ordini'
  return 'Spedizioni'
}

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
    .is('thread_id', null)
    .order('received_at', { ascending: false })

  if (error) console.error('[DashboardPage] Failed to fetch messages:', error.message)

  const messages = (data ?? []) as Message[]

  // Tickets conclusi visibili nel kanban solo 24h dopo la chiusura
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const kanbanMessages = messages.filter(
    (m) => m.status !== 'replied' || !m.replied_at || m.replied_at > cutoff24h,
  )

  const { category } = await searchParams

  // ── Category view: Kanban filtered by fixed category ──────────────────────────────
  if (typeof category === 'string' && category) {
    const filtered = kanbanMessages.filter((m) => mapToFixedCategory(m.notion_1) === category)
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

  // ── Default: category dashboard ─────────────────────────────────────────────
  const FIXED_CATEGORIES = ['Spedizioni', 'Reclami', 'Fatture', 'Richieste dipendenti', 'Ordini']
  const categoryMap = new Map<string, CategoryData>(
    FIXED_CATEGORIES.map((name) => [name, { notion: name, count: 0, arrived: 0, in_progress: 0 }])
  )

  for (const msg of messages) {
    const key = mapToFixedCategory(msg.notion_1)
    const existing = categoryMap.get(key)!
    existing.count++
    if (msg.status === 'arrived') existing.arrived++
    if (msg.status === 'in_progress') existing.in_progress++
  }

  const categories = FIXED_CATEGORIES.map((name) => categoryMap.get(name)!)

  const todayStr = new Date().toDateString()
  const stats = {
    total: kanbanMessages.length,
    arrived: kanbanMessages.filter((m) => m.status === 'arrived').length,
    in_progress: kanbanMessages.filter((m) => m.status === 'in_progress').length,
    replied: kanbanMessages.filter((m) => m.status === 'replied').length,
    arrivedToday: kanbanMessages.filter((m) => new Date(m.received_at).toDateString() === todayStr).length,
    urgent: kanbanMessages.filter(
      (m) =>
        m.status !== 'replied' &&
        (m.dati_estratti?.grado_urgenza === 'alta' || m.dati_estratti?.grado_urgenza === 'critica'),
    ).length,
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

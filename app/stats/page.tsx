import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { AppShell } from '@/app/components/layout/AppShell'
import { StatsClient } from './StatsClient'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: messages } = await db
    .from('messages')
    .select('status, settore, received_at')

  const byStatus = { arrived: 0, in_progress: 0, replied: 0 }
  const bySettore: Record<string, number> = {}
  const byDay: Record<string, number> = {}

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  // Fill all 30 days with 0 so the chart shows gaps correctly
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(d.getDate() + i)
    byDay[d.toISOString().split('T')[0]] = 0
  }

  for (const msg of messages ?? []) {
    if (msg.status === 'arrived' || msg.status === 'in_progress' || msg.status === 'replied') {
      byStatus[msg.status]++
    }

    const settore = msg.settore ?? 'Non classificato'
    bySettore[settore] = (bySettore[settore] ?? 0) + 1

    const date = new Date(msg.received_at)
    if (date >= thirtyDaysAgo) {
      const day = date.toISOString().split('T')[0]
      byDay[day] = (byDay[day] ?? 0) + 1
    }
  }

  const trendData = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
      count,
    }))

  const settoreData = Object.entries(bySettore)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count }))

  return (
    <AppShell userEmail={user.email ?? ''}>
      <StatsClient
        byStatus={byStatus}
        trendData={trendData}
        settoreData={settoreData}
        total={(messages ?? []).length}
      />
    </AppShell>
  )
}

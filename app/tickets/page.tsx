import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { AppShell } from '@/app/components/layout/AppShell'
import { TicketsList } from '@/app/components/tickets/TicketsList'
import type { Message } from '@/types/database'

export default async function TicketsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data } = await db
    .from('messages')
    .select('*')
    .order('received_at', { ascending: false })

  const messages = (data ?? []) as Message[]

  return (
    <AppShell userEmail={user.email ?? ''}>
      <div className="flex flex-1 flex-col overflow-hidden bg-white">

        <div className="shrink-0 border-b border-gray-200 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900">Ticket totali</h1>
          <p className="mt-0.5 text-sm text-gray-500">{messages.length} ticket nel sistema</p>
        </div>

        <TicketsList messages={messages} variant="all" />

      </div>
    </AppShell>
  )
}

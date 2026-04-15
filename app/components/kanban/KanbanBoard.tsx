'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import type { Message, KanbanStatus } from '@/types/database'
import { KanbanColumn } from './KanbanColumn'
import { MessageDetail } from '@/app/components/message/MessageDetail'
import { SearchBar, DEFAULT_FILTERS } from './SearchBar'
import type { Filters } from './SearchBar'
import { StatsRow } from './StatsRow'
import type { DashboardStats } from './StatsRow'
import { moveMessageAction, assignMessageAction } from '@/app/actions/messages'
import { buildOperatorList, findOperator } from '@/lib/team'
import type { Operator } from '@/lib/team'

type Columns = Record<KanbanStatus, Message[]>

const KANBAN_STATUSES: KanbanStatus[] = ['unread', 'read', 'replied']

// ─── Demo messages — shown when the database has no messages yet ───────────────

const DEMO_MESSAGES: Message[] = [
  // ── Arrivato ──
  {
    id: 'demo-1',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-1',
    thread_id: null,
    subject: 'Richiesta di preventivo per licenze enterprise',
    body: 'Buongiorno, siamo interessati a un piano enterprise per 50 utenti. Potete inviarci un preventivo dettagliato con le opzioni disponibili?',
    from_email: 'marco.ferrari@techcorp.it',
    from_name: 'Marco Ferrari',
    to_email: 'info@azienda.com',
    status: 'unread',
    priority: 'high',
    channel: 'email',
    assigned_to: 'sofia.b@team.dev',
    received_at: '2026-04-15T09:14:00.000Z',
    created_at: '2026-04-15T09:14:00.000Z',
  },
  {
    id: 'demo-2',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-2',
    thread_id: null,
    subject: 'Problema urgente con integrazione API',
    body: 'Ciao, da stamattina l\'integrazione con il vostro servizio non funziona. Restituisce errore 503. È urgente perché blocca la produzione.',
    from_email: 'sofia.chen@startupxyz.com',
    from_name: 'Sofia Chen',
    to_email: 'supporto@azienda.com',
    status: 'unread',
    priority: 'high',
    channel: 'whatsapp',
    assigned_to: 'marco.r@team.dev',
    received_at: '2026-04-15T08:47:00.000Z',
    created_at: '2026-04-15T08:47:00.000Z',
  },
  {
    id: 'demo-3',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-3',
    thread_id: null,
    subject: 'Feedback sul nuovo modulo di reportistica',
    body: 'Ho avuto modo di testare il nuovo modulo. In generale molto positivo, ma avrei qualche suggerimento sulla visualizzazione dei grafici.',
    from_email: 'luca.rossi@cliente.it',
    from_name: 'Luca Rossi',
    to_email: 'feedback@azienda.com',
    status: 'unread',
    priority: 'medium',
    channel: 'email',
    assigned_to: null,
    received_at: '2026-04-14T17:22:00.000Z',
    created_at: '2026-04-14T17:22:00.000Z',
  },
  {
    id: 'demo-4',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-4',
    thread_id: null,
    subject: 'Aggiornamento contratto annuale',
    body: 'Come da accordi, vi invio la documentazione aggiornata per il rinnovo contrattuale. Attendo conferma di ricezione.',
    from_email: 'anna.bianchi@partner.com',
    from_name: 'Anna Bianchi',
    to_email: 'amministrazione@azienda.com',
    status: 'unread',
    priority: 'low',
    channel: 'email',
    assigned_to: null,
    received_at: '2026-04-14T11:05:00.000Z',
    created_at: '2026-04-14T11:05:00.000Z',
  },
  // ── In svolgimento ──
  {
    id: 'demo-5',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-5',
    thread_id: null,
    subject: 'Demo prodotto confermata per venerdì 18',
    body: 'Confermo la call di venerdì alle 15:00. Parteciperà anche il nostro CTO. Può inviarci l\'agenda della demo in anticipo?',
    from_email: 'pietro.verdi@bigclient.it',
    from_name: 'Pietro Verdi',
    to_email: 'sales@azienda.com',
    status: 'read',
    priority: 'medium',
    channel: 'email',
    assigned_to: 'luca.m@team.dev',
    received_at: '2026-04-13T14:30:00.000Z',
    created_at: '2026-04-13T14:30:00.000Z',
  },
  {
    id: 'demo-6',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-6',
    thread_id: null,
    subject: 'Domanda sul piano Pro: limite utenti',
    body: 'Ciao! Stavo valutando il piano Pro. Il limite di 10 utenti è espandibile? Siamo un team di 12 persone.',
    from_email: 'elena.marino@studio.it',
    from_name: 'Elena Marino',
    to_email: 'info@azienda.com',
    status: 'read',
    priority: 'low',
    channel: 'whatsapp',
    assigned_to: null,
    received_at: '2026-04-13T10:18:00.000Z',
    created_at: '2026-04-13T10:18:00.000Z',
  },
  {
    id: 'demo-7',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-7',
    thread_id: null,
    subject: 'Report mensile Q1 2026 — richiesta revisione',
    body: 'Allego il report Q1 per la vostra revisione prima della presentazione al board. Qualche numero non mi torna nella sezione conversioni.',
    from_email: 'giacomo.conti@holding.it',
    from_name: 'Giacomo Conti',
    to_email: 'analytics@azienda.com',
    status: 'read',
    priority: 'high',
    channel: 'email',
    assigned_to: 'sofia.b@team.dev',
    received_at: '2026-04-12T16:55:00.000Z',
    created_at: '2026-04-12T16:55:00.000Z',
  },
  // ── Concluso ──
  {
    id: 'demo-8',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-8',
    thread_id: null,
    subject: 'Onboarding completato — benvenuto a bordo!',
    body: 'Il vostro account è ora attivo. Trovate tutta la documentazione nel portale. Il vostro customer success manager si metterà in contatto entro 24 ore.',
    from_email: 'onboarding@platform.com',
    from_name: 'Team Onboarding',
    to_email: 'info@azienda.com',
    status: 'replied',
    priority: 'low',
    channel: 'email',
    assigned_to: 'marco.r@team.dev',
    received_at: '2026-04-11T09:00:00.000Z',
    created_at: '2026-04-11T09:00:00.000Z',
  },
  {
    id: 'demo-9',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-9',
    thread_id: null,
    subject: 'Rinnovo abbonamento — conferma pagamento',
    body: 'Il rinnovo dell\'abbonamento annuale è stato elaborato con successo. La fattura è disponibile nella sezione "Fatturazione" del vostro account.',
    from_email: 'billing@platform.com',
    from_name: 'Team Fatturazione',
    to_email: 'amministrazione@azienda.com',
    status: 'replied',
    priority: 'medium',
    channel: 'email',
    assigned_to: null,
    received_at: '2026-04-10T13:42:00.000Z',
    created_at: '2026-04-10T13:42:00.000Z',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByStatus(messages: Message[]): Columns {
  const cols: Columns = { unread: [], read: [], replied: [] }
  for (const msg of messages) {
    if (msg.status === 'unread' || msg.status === 'read' || msg.status === 'replied') {
      cols[msg.status].push(msg)
    }
  }
  return cols
}

interface Props {
  initialMessages:  Message[]
  currentUserEmail: string
  myMessagesOnly?:  boolean
}

export function KanbanBoard({
  initialMessages,
  currentUserEmail,
  myMessagesOnly = false,
}: Props) {
  const seed = initialMessages.length === 0 ? DEMO_MESSAGES : initialMessages

  const [columns, setColumns] = useState<Columns>(() => groupByStatus(seed))
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [, startTransition] = useTransition()
  const isDemo = initialMessages.length === 0

  const operators: Operator[] = useMemo(
    () => buildOperatorList(currentUserEmail),
    [currentUserEmail],
  )

  const isFiltered =
    filters.query !== '' ||
    filters.channel !== 'all' ||
    filters.priority !== 'all' ||
    filters.date !== 'all'

  const filteredColumns = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    const now = Date.now()

    function matches(msg: Message): boolean {
      if (q) {
        const hay = [msg.subject, msg.body, msg.from_email, msg.from_name ?? '']
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filters.channel !== 'all' && msg.channel !== filters.channel) return false
      if (filters.priority !== 'all' && msg.priority !== filters.priority) return false
      if (filters.date !== 'all') {
        const ageDays = (now - new Date(msg.received_at).getTime()) / 86_400_000
        if (filters.date === 'today' && ageDays > 1)  return false
        if (filters.date === '7d'   && ageDays > 7)  return false
        if (filters.date === '30d'  && ageDays > 30) return false
      }
      if (myMessagesOnly && msg.assigned_to !== currentUserEmail) return false
      return true
    }

    return {
      unread:  columns.unread.filter(matches),
      read:    columns.read.filter(matches),
      replied: columns.replied.filter(matches),
    }
  }, [columns, filters, myMessagesOnly, currentUserEmail])

  const totalMessages = Object.values(columns).reduce((sum, col) => sum + col.length, 0)
  const filteredTotal = Object.values(filteredColumns).reduce((sum, col) => sum + col.length, 0)

  const stats = useMemo((): DashboardStats => {
    const all = [...columns.unread, ...columns.read, ...columns.replied]
    const now = Date.now()

    // 1. Received today (since midnight local time)
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const receivedToday = all.filter(
      (m) => new Date(m.received_at) >= startOfToday,
    ).length

    // 2. Avg response time — Message has no replied_at field; show demo estimate only
    const avgResponseHours = isDemo ? 2.4 : null

    // 3. % resolved in last 24 h
    const last24h = all.filter(
      (m) => now - new Date(m.received_at).getTime() <= 86_400_000,
    )
    const resolvedPct24h =
      last24h.length > 0
        ? Math.round(
            (last24h.filter((m) => m.status === 'replied').length / last24h.length) * 100,
          )
        : 0

    // 4. High-priority unread
    const highPriorityUnread = columns.unread.filter(
      (m) => m.priority === 'high',
    ).length

    return { receivedToday, avgResponseHours, resolvedPct24h, highPriorityUnread }
  }, [columns, isDemo])

  function handleDrop(messageId: string, fromStatus: KanbanStatus, toStatus: KanbanStatus) {
    // Optimistic update
    setColumns((prev) => {
      const msg = prev[fromStatus].find((m) => m.id === messageId)
      if (!msg) return prev
      return {
        ...prev,
        [fromStatus]: prev[fromStatus].filter((m) => m.id !== messageId),
        [toStatus]: [{ ...msg, status: toStatus }, ...prev[toStatus]],
      }
    })

    if (isDemo) return  // demo cards: UI-only, skip server action

    setPendingIds((prev) => new Set(prev).add(messageId))

    startTransition(async () => {
      try {
        await moveMessageAction(messageId, toStatus)
      } catch {
        // Revert on failure
        setColumns((prev) => {
          const msg = prev[toStatus].find((m) => m.id === messageId)
          if (!msg) return prev
          return {
            ...prev,
            [toStatus]: prev[toStatus].filter((m) => m.id !== messageId),
            [fromStatus]: [{ ...msg, status: fromStatus }, ...prev[fromStatus]],
          }
        })
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev)
          next.delete(messageId)
          return next
        })
      }
    })
  }

  function handleAssign(messageId: string, assignedTo: string | null) {
    // Optimistic update
    setColumns((prev) => {
      const next = { ...prev }
      for (const status of KANBAN_STATUSES) {
        next[status] = prev[status].map((m) =>
          m.id === messageId ? { ...m, assigned_to: assignedTo } : m,
        )
      }
      return next
    })
    // Also keep selectedMessage in sync
    setSelectedMessage((prev) =>
      prev?.id === messageId ? { ...prev, assigned_to: assignedTo } : prev,
    )

    if (isDemo) return

    startTransition(async () => {
      try {
        await assignMessageAction(messageId, assignedTo)
      } catch (err) {
        console.error('[handleAssign]', err)
      }
    })
  }

  function handleMessageStatusChange(messageId: string, newStatus: KanbanStatus) {
    setColumns((prev) => {
      const fromStatus = (Object.keys(prev) as KanbanStatus[]).find((s) =>
        prev[s].some((m) => m.id === messageId),
      )
      if (!fromStatus || fromStatus === newStatus) return prev
      const msg = prev[fromStatus].find((m) => m.id === messageId)!
      return {
        ...prev,
        [fromStatus]: prev[fromStatus].filter((m) => m.id !== messageId),
        [newStatus]: [{ ...msg, status: newStatus }, ...prev[newStatus]],
      }
    })
    setSelectedMessage(null)
  }

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      {/* Dashboard header */}
      <header className="shrink-0 border-b border-white/[0.06] bg-zinc-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-white">InboxManager</h1>
              {isDemo && (
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-300 ring-1 ring-inset ring-amber-500/30">
                  Demo
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-zinc-500">
              {isDemo
                ? 'Dati di esempio — collega il tuo account per iniziare'
                : isFiltered
                  ? `${filteredTotal} di ${totalMessages} messaggi`
                  : `${totalMessages} messaggi totali`}
            </p>
          </div>

          {/* Stats chips */}
          <div className="hidden items-center gap-2 sm:flex">
            <Chip label="Arrivati"       count={filteredColumns.unread.length}  color="blue" />
            <Chip label="In svolgimento" count={filteredColumns.read.length}    color="amber" />
            <Chip label="Conclusi"       count={filteredColumns.replied.length} color="emerald" />
          </div>
        </div>
      </header>

      {/* Search & filters bar */}
      <SearchBar
        filters={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        isFiltered={isFiltered}
      />

      {/* Stats widgets */}
      <StatsRow stats={stats} />

      {/* Kanban columns */}
      <main className="flex flex-1 overflow-x-auto px-5 py-5">
        {KANBAN_STATUSES.map((status, index) => (
          <Fragment key={status}>
            {/* Vertical divider between columns */}
            {index > 0 && (
              <div className="mx-4 w-px shrink-0 self-stretch rounded-full bg-white/[0.06]" />
            )}
            <KanbanColumn
              status={status}
              messages={filteredColumns[status]}
              pendingIds={pendingIds}
              onDrop={handleDrop}
              onSelectMessage={setSelectedMessage}
              operators={operators}
              onAssign={handleAssign}
            />
          </Fragment>
        ))}
      </main>

      {selectedMessage && (
        <MessageDetail
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
          onStatusChange={handleMessageStatusChange}
          onAssign={handleAssign}
          operators={operators}
          isDemo={isDemo}
        />
      )}
    </div>
  )
}

function Chip({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: 'blue' | 'amber' | 'emerald'
}) {
  const styles = {
    blue:    'bg-blue-500/10 text-blue-300 ring-blue-500/30',
    amber:   'bg-amber-500/10 text-amber-300 ring-amber-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  }
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1',
        'text-xs font-medium ring-1 ring-inset',
        styles[color],
      ].join(' ')}
    >
      {label}
      <span className="font-bold tabular-nums">{count}</span>
    </span>
  )
}

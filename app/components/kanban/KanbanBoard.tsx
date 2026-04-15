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
import { countCritical } from '@/lib/logistics/token-health'

type Columns = Record<KanbanStatus, Message[]>

const KANBAN_STATUSES: KanbanStatus[] = ['arrived', 'in_progress', 'replied']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByStatus(messages: Message[]): Columns {
  const cols: Columns = { arrived: [], in_progress: [], replied: [] }
  for (const msg of messages) {
    if (msg.status === 'arrived' || msg.status === 'in_progress' || msg.status === 'replied') {
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
  const [columns, setColumns] = useState<Columns>(() => groupByStatus(initialMessages))
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [, startTransition] = useTransition()

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
      arrived:     columns.arrived.filter(matches),
      in_progress: columns.in_progress.filter(matches),
      replied:     columns.replied.filter(matches),
    }
  }, [columns, filters, myMessagesOnly, currentUserEmail])

  const totalMessages = Object.values(columns).reduce((sum, col) => sum + col.length, 0)
  const filteredTotal = Object.values(filteredColumns).reduce((sum, col) => sum + col.length, 0)

  const stats = useMemo((): DashboardStats => {
    const all = [...columns.arrived, ...columns.in_progress, ...columns.replied]
    const now = Date.now()

    // 1. Received today (since midnight local time)
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const receivedToday = all.filter(
      (m) => new Date(m.received_at) >= startOfToday,
    ).length

    // 2. Avg response time — Message has no replied_at field
    const avgResponseHours = null

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

    // 4. High-priority arrived (not yet handled)
    const highPriorityUnread = columns.arrived.filter(
      (m) => m.priority === 'high',
    ).length

    // 5. Critical tokens across all active columns (not archived)
    const criticalTokens = countCritical([
      ...columns.arrived,
      ...columns.in_progress,
      ...columns.replied,
    ])

    return { receivedToday, avgResponseHours, resolvedPct24h, highPriorityUnread, criticalTokens }
  }, [columns])

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
            <h1 className="text-xl font-bold tracking-tight text-white">InboxManager</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {isFiltered
                ? `${filteredTotal} di ${totalMessages} messaggi`
                : `${totalMessages} messaggi totali`}
            </p>
          </div>

          {/* Stats chips */}
          <div className="hidden items-center gap-2 sm:flex">
            <Chip label="Arrivati"       count={filteredColumns.arrived.length}     color="blue" />
            <Chip label="In svolgimento" count={filteredColumns.in_progress.length} color="amber" />
            <Chip label="Conclusi"       count={filteredColumns.replied.length}     color="emerald" />
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

'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import type { Message, KanbanStatus } from '@/types/database'
import { KanbanColumn } from './KanbanColumn'
import { MessageDetail } from '@/app/components/message/MessageDetail'
import { SearchBar, DEFAULT_FILTERS } from './SearchBar'
import type { Filters } from './SearchBar'
import { moveMessageAction, assignMessageAction } from '@/app/actions/messages'
import { buildOperatorList } from '@/lib/team'
import type { Operator } from '@/lib/team'

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
  categoryTitle?:   string
}

export function KanbanBoard({
  initialMessages,
  currentUserEmail,
  myMessagesOnly = false,
  categoryTitle,
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
    // Keep panel open — just sync the status so the card reflects the new column
    setSelectedMessage((prev) =>
      prev?.id === messageId ? { ...prev, status: newStatus } : prev,
    )
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Search & filters bar */}
      <SearchBar
        filters={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        isFiltered={isFiltered}
        categoryTitle={categoryTitle}
      />

      {/* Kanban columns */}
      <main className="flex flex-1 overflow-x-auto px-5 py-5">
        {KANBAN_STATUSES.map((status, index) => (
          <Fragment key={status}>
            {/* Vertical divider between columns */}
            {index > 0 && (
              <div className="mx-4 w-px shrink-0 self-stretch rounded-full bg-gray-200" />
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
        />
      )}
    </div>
  )
}


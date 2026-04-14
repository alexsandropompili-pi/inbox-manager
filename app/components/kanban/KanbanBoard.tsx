'use client'

import { useState, useTransition } from 'react'
import type { Message, KanbanStatus } from '@/types/database'
import { KanbanColumn } from './KanbanColumn'
import { MessageDetail } from '@/app/components/message/MessageDetail'
import { moveMessageAction } from '@/app/actions/messages'

type Columns = Record<KanbanStatus, Message[]>

const KANBAN_STATUSES: KanbanStatus[] = ['unread', 'read', 'replied']

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
  initialMessages: Message[]
}

export function KanbanBoard({ initialMessages }: Props) {
  const [columns, setColumns] = useState<Columns>(() => groupByStatus(initialMessages))
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [, startTransition] = useTransition()

  const totalMessages = Object.values(columns).reduce((sum, col) => sum + col.length, 0)

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

    // Mark as pending while the server action runs
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
    <div className="flex h-full flex-col">
      {/* Dashboard header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">InboxManager</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {totalMessages} messaggi totali
            </p>
          </div>

          {/* Stats chips */}
          <div className="hidden items-center gap-3 sm:flex">
            <Chip label="Arrivati"       count={columns.unread.length}  color="blue" />
            <Chip label="In svolgimento" count={columns.read.length}    color="amber" />
            <Chip label="Conclusi"       count={columns.replied.length} color="emerald" />
          </div>
        </div>
      </header>

      {/* Kanban columns */}
      <main className="flex flex-1 gap-4 overflow-x-auto p-6">
        {KANBAN_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            messages={columns[status]}
            pendingIds={pendingIds}
            onDrop={handleDrop}
            onSelectMessage={setSelectedMessage}
          />
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
    blue:    'bg-blue-50 text-blue-700 ring-blue-200',
    amber:   'bg-amber-50 text-amber-700 ring-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
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

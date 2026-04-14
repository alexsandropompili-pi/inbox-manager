'use client'

import { useState } from 'react'
import type { Message, KanbanStatus } from '@/types/database'
import { MessageCard } from './MessageCard'

interface ColumnConfig {
  label: string
  headerBg: string
  headerText: string
  countBg: string
  countText: string
  dropRing: string
}

export const COLUMN_CONFIG: Record<KanbanStatus, ColumnConfig> = {
  unread: {
    label:      'Arrivato',
    headerBg:   'bg-blue-50',
    headerText: 'text-blue-800',
    countBg:    'bg-blue-100',
    countText:  'text-blue-700',
    dropRing:   'ring-2 ring-blue-400 bg-blue-50/50',
  },
  read: {
    label:      'In svolgimento',
    headerBg:   'bg-amber-50',
    headerText: 'text-amber-800',
    countBg:    'bg-amber-100',
    countText:  'text-amber-700',
    dropRing:   'ring-2 ring-amber-400 bg-amber-50/50',
  },
  replied: {
    label:      'Concluso',
    headerBg:   'bg-emerald-50',
    headerText: 'text-emerald-800',
    countBg:    'bg-emerald-100',
    countText:  'text-emerald-700',
    dropRing:   'ring-2 ring-emerald-400 bg-emerald-50/50',
  },
}

interface Props {
  status: KanbanStatus
  messages: Message[]
  pendingIds: Set<string>
  onDrop: (messageId: string, fromStatus: KanbanStatus, toStatus: KanbanStatus) => void
  onSelectMessage: (message: Message) => void
}

export function KanbanColumn({ status, messages, pendingIds, onDrop, onSelectMessage }: Props) {
  const [isDragOver, setIsDragOver] = useState(false)
  const config = COLUMN_CONFIG[status]

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    // Only clear when leaving the column entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    try {
      const raw = e.dataTransfer.getData('application/x-kanban')
      if (!raw) return
      const { id, fromStatus } = JSON.parse(raw) as { id: string; fromStatus: KanbanStatus }
      if (fromStatus !== status) {
        onDrop(id, fromStatus, status)
      }
    } catch {
      // malformed dataTransfer — ignore
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      {/* Column header */}
      <div className={['flex items-center justify-between rounded-xl px-4 py-3', config.headerBg].join(' ')}>
        <h2 className={['text-sm font-semibold tracking-wide', config.headerText].join(' ')}>
          {config.label}
        </h2>
        <span
          className={[
            'flex h-6 min-w-6 items-center justify-center rounded-full px-1.5',
            'text-xs font-bold tabular-nums',
            config.countBg,
            config.countText,
          ].join(' ')}
        >
          {messages.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'flex flex-col gap-3 rounded-xl p-2 transition-all duration-150',
          'min-h-32 flex-1',
          isDragOver ? config.dropRing : 'ring-1 ring-transparent',
        ].join(' ')}
      >
        {messages.length === 0 && !isDragOver && (
          <p className="mt-4 text-center text-xs text-zinc-400">Nessun messaggio</p>
        )}
        {messages.map((msg) => (
          <MessageCard
            key={msg.id}
            message={msg}
            columnStatus={status}
            isPending={pendingIds.has(msg.id)}
            onClick={onSelectMessage}
          />
        ))}
      </div>
    </div>
  )
}

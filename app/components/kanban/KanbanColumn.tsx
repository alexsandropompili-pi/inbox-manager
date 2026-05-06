'use client'

import { useState } from 'react'
import type { Message, KanbanStatus } from '@/types/database'
import type { Operator } from '@/lib/team'
import { MessageCard } from './MessageCard'

interface ColumnConfig {
  label: string
  accentLine: string
  headerText: string
  countBg: string
  countText: string
  dropRing: string
}

export const COLUMN_CONFIG: Record<KanbanStatus, ColumnConfig> = {
  arrived: {
    label:      'Arrivato',
    accentLine: 'bg-blue-500',
    headerText: 'text-blue-700',
    countBg:    'bg-blue-50 border border-blue-200',
    countText:  'text-blue-600',
    dropRing:   'ring-2 ring-blue-400/40 bg-blue-50/50',
  },
  in_progress: {
    label:      'In svolgimento',
    accentLine: 'bg-orange-500',
    headerText: 'text-orange-700',
    countBg:    'bg-orange-50 border border-orange-200',
    countText:  'text-orange-600',
    dropRing:   'ring-2 ring-orange-400/40 bg-orange-50/50',
  },
  replied: {
    label:      'Concluso',
    accentLine: 'bg-emerald-500',
    headerText: 'text-emerald-700',
    countBg:    'bg-emerald-50 border border-emerald-200',
    countText:  'text-emerald-600',
    dropRing:   'ring-2 ring-emerald-400/40 bg-emerald-50/50',
  },
}

interface Props {
  status: KanbanStatus
  messages: Message[]
  pendingIds: Set<string>
  onDrop: (messageId: string, fromStatus: KanbanStatus, toStatus: KanbanStatus) => void
  onSelectMessage: (message: Message) => void
  operators: Operator[]
  onAssign: (messageId: string, assignedTo: string | null) => void
}

export function KanbanColumn({
  status, messages, pendingIds, onDrop, onSelectMessage, operators, onAssign,
}: Props) {
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
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Colored accent line */}
      <div className={['h-[3px] w-full shrink-0', config.accentLine].join(' ')} />

      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className={['text-sm font-semibold tracking-wide', config.headerText].join(' ')}>
          {config.label}
        </h2>
        <span
          className={[
            'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5',
            'text-[11px] font-bold tabular-nums',
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
          'flex flex-1 flex-col gap-2.5 overflow-y-auto rounded-lg p-2.5 transition-all duration-150',
          'min-h-32',
          isDragOver ? config.dropRing : 'ring-1 ring-transparent',
        ].join(' ')}
      >
        {messages.length === 0 && !isDragOver && (
          <p className="mt-6 text-center text-xs text-gray-400">Nessun messaggio</p>
        )}
        {messages.map((msg) => (
          <MessageCard
            key={msg.id}
            message={msg}
            columnStatus={status}
            isPending={pendingIds.has(msg.id)}
            onClick={onSelectMessage}
            operators={operators}
            onAssign={onAssign}
          />
        ))}
      </div>
    </div>
  )
}

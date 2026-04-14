'use client'

import React from 'react'
import type { Message, KanbanStatus, MessagePriority, MessageChannel } from '@/types/database'

const PRIORITY_CONFIG: Record<MessagePriority, { label: string; dot: string; badge: string }> = {
  high:   { label: 'Alta',   dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700 ring-red-600/20' },
  medium: { label: 'Media',  dot: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  low:    { label: 'Bassa',  dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
}

const CHANNEL_CONFIG: Record<MessageChannel, { label: string; icon: string }> = {
  email:     { label: 'Email',     icon: '✉' },
  whatsapp:  { label: 'WhatsApp',  icon: '💬' },
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

interface Props {
  message: Message
  columnStatus: KanbanStatus
  isPending: boolean
  onClick: (message: Message) => void
}

export function MessageCard({ message, columnStatus, isPending, onClick }: Props) {
  const priority = message.priority ? PRIORITY_CONFIG[message.priority] : null
  const channel  = message.channel  ? CHANNEL_CONFIG[message.channel]   : CHANNEL_CONFIG.email

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData(
      'application/x-kanban',
      JSON.stringify({ id: message.id, fromStatus: columnStatus }),
    )
  }

  // Track whether a drag actually moved so we can suppress the click.
  const dragMovedRef = React.useRef(false)

  function handleDragStartWithFlag(e: React.DragEvent<HTMLDivElement>) {
    dragMovedRef.current = false
    handleDragStart(e)
  }

  function handleDragEndWithFlag(e: React.DragEvent<HTMLDivElement>) {
    if (e.dataTransfer.dropEffect === 'move') {
      dragMovedRef.current = true
    }
  }

  function handleClick() {
    if (dragMovedRef.current) return
    onClick(message)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStartWithFlag}
      onDragEnd={handleDragEndWithFlag}
      onClick={handleClick}
      className={[
        'group rounded-xl border border-zinc-200 bg-white p-4 shadow-sm',
        'cursor-grab active:cursor-grabbing select-none',
        'transition-all duration-150',
        isPending ? 'opacity-50 pointer-events-none' : 'hover:shadow-md hover:-translate-y-0.5',
      ].join(' ')}
    >
      {/* Top row: channel + priority */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
          <span>{channel.icon}</span>
          {channel.label}
        </span>

        {priority && (
          <span
            className={[
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
              priority.badge,
            ].join(' ')}
          >
            <span className={['h-1.5 w-1.5 rounded-full', priority.dot].join(' ')} />
            {priority.label}
          </span>
        )}
      </div>

      {/* Subject */}
      <p className="mb-1 line-clamp-2 text-sm font-semibold leading-snug text-zinc-900">
        {message.subject}
      </p>

      {/* Sender */}
      <p className="mb-3 truncate text-xs text-zinc-500">
        {message.from_name
          ? `${message.from_name} <${message.from_email}>`
          : message.from_email}
      </p>

      {/* Date */}
      {/* suppressHydrationWarning: Intl.DateTimeFormat uses the local timezone on
          the client but UTC on the server, so the formatted string intentionally
          differs until React hydrates and re-renders with the correct timezone. */}
      <p className="text-xs text-zinc-400" suppressHydrationWarning>
        {formatDate(message.received_at)}
      </p>
    </div>
  )
}

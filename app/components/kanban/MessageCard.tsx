'use client'

import React from 'react'
import type { Message, KanbanStatus, MessagePriority, MessageChannel } from '@/types/database'

const PRIORITY_CONFIG: Record<MessagePriority, { label: string; dot: string; badge: string }> = {
  high:   { label: 'Alta',   dot: 'bg-red-400',     badge: 'bg-red-500/10 text-red-300 ring-red-500/30' },
  medium: { label: 'Media',  dot: 'bg-amber-400',   badge: 'bg-amber-500/10 text-amber-300 ring-amber-500/30' },
  low:    { label: 'Bassa',  dot: 'bg-emerald-400', badge: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' },
}

const CHANNEL_CONFIG: Record<MessageChannel, { label: string; icon: string; badge: string }> = {
  email:    { label: 'Email',    icon: '✉', badge: 'bg-blue-500/10 text-blue-300 ring-blue-500/20' },
  whatsapp: { label: 'WhatsApp', icon: '💬', badge: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20' },
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
        'group rounded-xl border border-white/[0.07] bg-zinc-800/60 p-4',
        'shadow-md shadow-black/40',
        'cursor-grab active:cursor-grabbing select-none',
        'transition-all duration-200 ease-out',
        isPending
          ? 'opacity-40 pointer-events-none'
          : 'hover:-translate-y-1 hover:shadow-xl hover:shadow-black/60 hover:border-white/[0.14] hover:bg-zinc-800',
      ].join(' ')}
    >
      {/* Top row: channel + priority */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={[
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5',
            'text-xs font-medium ring-1 ring-inset',
            channel.badge,
          ].join(' ')}
        >
          <span className="text-[11px]">{channel.icon}</span>
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
      <p className="mb-1 line-clamp-2 text-sm font-semibold leading-snug text-zinc-100 group-hover:text-white transition-colors">
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
      <p className="text-xs text-zinc-600" suppressHydrationWarning>
        {formatDate(message.received_at)}
      </p>
    </div>
  )
}

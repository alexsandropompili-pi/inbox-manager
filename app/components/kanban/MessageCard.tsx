'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { Message, KanbanStatus, MessagePriority, MessageChannel } from '@/types/database'
import type { Operator } from '@/lib/team'
import { findOperator } from '@/lib/team'
import { computeTokenHealth, type TokenHealth } from '@/lib/logistics/token-health'

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

// ─── AssigneeDropdown ─────────────────────────────────────────────────────────

interface AssigneeDropdownProps {
  assignedTo:  string | null
  operators:   Operator[]
  onAssign:    (assignedTo: string | null) => void
}

function AssigneeDropdown({ assignedTo, operators, onAssign }: AssigneeDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const current = findOperator(assignedTo, operators)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleSelect(id: string | null) {
    onAssign(id)
    setOpen(false)
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      // Prevent card click (open detail panel) when interacting with this widget
      onClick={(e) => e.stopPropagation()}
    >
      {/* Avatar / unassigned trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={current ? `Assegnato a ${current.name}` : 'Assegna operatore'}
        className={[
          'flex h-6 w-6 items-center justify-center rounded-full',
          'text-[9px] font-bold text-white',
          'ring-1 ring-white/20 transition-all duration-150',
          'hover:ring-white/50 hover:scale-110',
          current
            ? current.color
            : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-400',
        ].join(' ')}
      >
        {current ? current.initials : (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={[
            'absolute bottom-full right-0 z-50 mb-2',
            'min-w-[160px] rounded-xl border border-white/[0.1]',
            'bg-zinc-800 shadow-xl shadow-black/60',
            'overflow-hidden',
          ].join(' ')}
        >
          <p className="border-b border-white/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Assegna a
          </p>
          <div className="p-1">
            {operators.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => handleSelect(op.id)}
                className={[
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2',
                  'text-sm transition-colors duration-100',
                  assignedTo === op.id
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-300 hover:bg-white/5',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                    'text-[9px] font-bold text-white',
                    op.color,
                  ].join(' ')}
                >
                  {op.initials}
                </span>
                <span className="truncate font-medium">{op.name}</span>
                {assignedTo === op.id && (
                  <svg className="ml-auto h-3.5 w-3.5 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          {assignedTo && (
            <div className="border-t border-white/[0.06] p-1">
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Rimuovi assegnazione
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Health badge ─────────────────────────────────────────────────────────────

const HEALTH_CONFIG: Record<TokenHealth, {
  dot:     string
  ring:    string
  pulse:   boolean
  label:   string
}> = {
  ok: {
    dot:   'bg-emerald-400',
    ring:  'ring-emerald-500/30',
    pulse: false,
    label: 'Salute: OK',
  },
  warning: {
    dot:   'bg-amber-400',
    ring:  'ring-amber-500/40',
    pulse: false,
    label: 'In svolgimento da più di 4 ore senza risposta',
  },
  critical: {
    dot:   'bg-red-500',
    ring:  'ring-red-500/40',
    pulse: true,
    label: 'Critico — richiede attenzione immediata',
  },
}

function HealthBadge({ health }: { health: TokenHealth }) {
  const cfg = HEALTH_CONFIG[health]
  return (
    <span
      title={cfg.label}
      className={[
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
        'ring-1 ring-inset bg-zinc-900/60',
        cfg.ring,
      ].join(' ')}
    >
      <span
        className={[
          'h-2 w-2 rounded-full',
          cfg.dot,
          cfg.pulse ? 'animate-pulse' : '',
        ].join(' ')}
      />
    </span>
  )
}

// ─── MessageCard ──────────────────────────────────────────────────────────────

interface Props {
  message:      Message
  columnStatus: KanbanStatus
  isPending:    boolean
  onClick:      (message: Message) => void
  operators:    Operator[]
  onAssign:     (messageId: string, assignedTo: string | null) => void
}

export function MessageCard({ message, columnStatus, isPending, onClick, operators, onAssign }: Props) {
  const priority = message.priority ? PRIORITY_CONFIG[message.priority] : null
  const channel  = message.channel  ? CHANNEL_CONFIG[message.channel]   : CHANNEL_CONFIG.email
  const health   = computeTokenHealth(message)

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

  // Border + glow classes driven by health state
  const healthBorderClass =
    health === 'critical'
      ? 'border-red-500/70 animate-pulse-red-border'
      : health === 'warning'
        ? 'border-amber-500/50'
        : 'border-white/[0.07]'

  return (
    <div
      draggable
      onDragStart={handleDragStartWithFlag}
      onDragEnd={handleDragEndWithFlag}
      onClick={handleClick}
      className={[
        'group relative rounded-xl border bg-zinc-800/60 p-4',
        'shadow-md shadow-black/40',
        'cursor-grab active:cursor-grabbing select-none',
        'transition-colors duration-200 ease-out',
        healthBorderClass,
        isPending
          ? 'opacity-40 pointer-events-none'
          : 'hover:-translate-y-1 hover:shadow-xl hover:shadow-black/60 hover:bg-zinc-800',
      ].join(' ')}
    >
      {/* Health badge — absolute top-left */}
      <div className="absolute -top-2 -left-2 z-10">
        <HealthBadge health={health} />
      </div>

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

      {/* Logistics token code */}
      {message.token_code && (
        <p className="mb-1 font-mono text-[10px] font-semibold tracking-widest text-zinc-500 group-hover:text-zinc-400 transition-colors">
          {message.token_code}
        </p>
      )}

      {/* Sender */}
      <p className="mb-3 truncate text-xs text-zinc-500">
        {message.from_name
          ? `${message.from_name} <${message.from_email}>`
          : message.from_email}
      </p>

      {/* Footer: date + assignee */}
      <div className="flex items-center justify-between gap-2">
        {/* suppressHydrationWarning: Intl.DateTimeFormat uses the local timezone on
            the client but UTC on the server, so the formatted string intentionally
            differs until React hydrates and re-renders with the correct timezone. */}
        <p className="text-xs text-zinc-600" suppressHydrationWarning>
          {formatDate(message.received_at)}
        </p>

        <AssigneeDropdown
          assignedTo={message.assigned_to}
          operators={operators}
          onAssign={(assignedTo) => onAssign(message.id, assignedTo)}
        />
      </div>
    </div>
  )
}

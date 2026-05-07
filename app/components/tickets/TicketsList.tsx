'use client'

import { useState } from 'react'
import type { Message, KanbanStatus } from '@/types/database'
import { MessageDetail } from '@/app/components/message/MessageDetail'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAge(receivedAt: string): string {
  const diff = Date.now() - new Date(receivedAt).getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  const mins = Math.floor(diff / 60000)
  if (days > 0) return `${days} ${days === 1 ? 'giorno' : 'giorni'}`
  if (hours > 0) return `${hours} ${hours === 1 ? 'ora' : 'ore'}`
  return `${Math.max(mins, 1)} ${mins === 1 ? 'minuto' : 'minuti'}`
}

function formatTime(receivedAt: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(receivedAt))
}

function statusLabel(status: string): string {
  if (status === 'arrived') return 'Arrivato'
  if (status === 'in_progress') return 'In svolgimento'
  return 'Concluso'
}

function statusColor(status: string): string {
  if (status === 'arrived') return 'text-blue-600'
  if (status === 'in_progress') return 'text-amber-600'
  return 'text-gray-400'
}

function urgencyLabel(urgency: string | undefined): string {
  if (urgency === 'critica') return 'Critica'
  if (urgency === 'alta') return 'Alta'
  return '—'
}

function urgencyColor(urgency: string | undefined): string {
  if (urgency === 'critica') return 'text-red-600 font-semibold'
  if (urgency === 'alta') return 'text-orange-500 font-semibold'
  return 'text-gray-300'
}

// ─── Column configs ────────────────────────────────────────────────────────────

export type TicketsVariant = 'all' | 'today' | 'urgent'

const GRID: Record<TicketsVariant, string> = {
  all:    'grid-cols-[1fr_160px_160px]',
  today:  'grid-cols-[1fr_160px_160px]',
  urgent: 'grid-cols-[1fr_140px_140px_140px]',
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  messages: Message[]
  variant:  TicketsVariant
}

export function TicketsList({ messages: initial, variant }: Props) {
  const [messages, setMessages] = useState(initial)
  const [selected, setSelected] = useState<Message | null>(null)

  function handleStatusChange(messageId: string, newStatus: KanbanStatus) {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, status: newStatus } : m)),
    )
    setSelected(null)
  }

  const grid = GRID[variant]

  return (
    <>
      {/* Column headers */}
      <div className={`shrink-0 grid ${grid} border-b border-gray-200 bg-gray-50 px-8 py-3`}>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Nome</span>
        {variant === 'urgent' && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Urgenza</span>
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Stato</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {variant === 'today' ? 'Orario' : 'Tempo nel sistema'}
        </span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {messages.map((msg) => {
          const urgency = msg.dati_estratti?.grado_urgenza as string | undefined
          return (
            <button
              key={msg.id}
              type="button"
              onClick={() => setSelected(msg)}
              className={`w-full text-left grid ${grid} border-b border-gray-100 px-8 py-4 hover:bg-gray-50 transition-colors`}
            >
              <div className="min-w-0 pr-8">
                <p className="text-sm font-medium text-gray-900 truncate">{msg.subject}</p>
                <p className="mt-0.5 text-xs text-gray-400 truncate">
                  {msg.from_name ? `${msg.from_name} — ${msg.from_email}` : msg.from_email}
                </p>
              </div>
              {variant === 'urgent' && (
                <span className={`text-sm self-center ${urgencyColor(urgency)}`}>
                  {urgencyLabel(urgency)}
                </span>
              )}
              <span className={`text-sm font-medium self-center ${statusColor(msg.status)}`}>
                {statusLabel(msg.status)}
              </span>
              <span className="text-sm text-gray-500 self-center" suppressHydrationWarning>
                {variant === 'today'
                  ? formatTime(msg.received_at)
                  : msg.status !== 'replied'
                    ? formatAge(msg.received_at)
                    : '—'}
              </span>
            </button>
          )
        })}

        {messages.length === 0 && (
          <div className="px-8 py-20 text-center text-sm text-gray-400">
            {variant === 'today'
              ? 'Nessun ticket ricevuto oggi.'
              : variant === 'urgent'
                ? 'Nessun ticket urgente al momento.'
                : 'Nessun ticket nel sistema.'}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <MessageDetail
          message={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  )
}

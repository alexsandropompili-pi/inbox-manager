'use client'

import { useEffect, useState } from 'react'
import { computeSla, type SlaInfo, type SlaStatus } from '@/lib/logistics/sla'
import type { Message } from '@/types/database'

function formatRemaining(ms: number): string {
  if (ms <= 0) {
    const elapsed = Math.abs(ms)
    const h = Math.floor(elapsed / 3_600_000)
    const m = Math.floor((elapsed % 3_600_000) / 60_000)
    if (h > 0) return `Scad. ${h}h`
    return `Scad. ${m}m`
  }
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h >= 1) return `${h}h ${m}m`
  return `${m}m`
}

function formatDeadline(ms: number): string {
  return new Intl.DateTimeFormat('it-IT', {
    day:    '2-digit',
    month:  'short',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(ms))
}

const STATUS_STYLES: Record<SlaStatus, string> = {
  ok:      'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 ring-amber-500/30',
  breach:  'bg-red-500/15 text-red-400 ring-red-500/30',
}

interface Props {
  message: Message
}

export function SlaChip({ message }: Props) {
  // Initialise as null to avoid SSR/hydration mismatch (Date.now() differs)
  const [sla, setSla] = useState<SlaInfo | null>(null)

  useEffect(() => {
    setSla(computeSla(message))
    const id = setInterval(() => setSla(computeSla(message)), 60_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id, message.received_at, message.dati_estratti, message.priority])

  if (!sla) return null

  return (
    <span
      title={`Scadenza SLA: ${formatDeadline(sla.deadlineMs)}`}
      className={[
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
        'text-[10px] font-semibold tabular-nums ring-1 ring-inset',
        STATUS_STYLES[sla.status],
        sla.status === 'breach' ? 'animate-pulse' : '',
      ].join(' ')}
    >
      <svg
        className="h-2.5 w-2.5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
      {formatRemaining(sla.remainingMs)}
    </span>
  )
}

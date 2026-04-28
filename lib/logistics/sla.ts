/**
 * SLA (Service Level Agreement) module
 *
 * Computes deadline and remaining time for each active message based on its
 * urgency level (from dati_estratti) or priority field.
 *
 * Thresholds:
 *   critica / high   →  2 h
 *   alta             →  4 h
 *   media / medium   → 24 h
 *   bassa / low      → 48 h
 *   default          → 24 h
 *
 * SLA applies only to messages that are not yet replied or archived.
 */

import type { Message } from '@/types/database'

const SLA_BY_URGENZA: Record<string, number> = {
  critica: 2  * 3_600_000,
  alta:    4  * 3_600_000,
  media:   24 * 3_600_000,
  bassa:   48 * 3_600_000,
}

const SLA_BY_PRIORITY: Record<string, number> = {
  high:   2  * 3_600_000,
  medium: 24 * 3_600_000,
  low:    48 * 3_600_000,
}

const SLA_DEFAULT_MS = 24 * 3_600_000

export type SlaStatus = 'ok' | 'warning' | 'breach'

export interface SlaInfo {
  deadlineMs:  number   // absolute epoch ms when SLA expires
  remainingMs: number   // ms remaining — negative when breached
  slaTotalMs:  number   // total SLA window
  status:      SlaStatus
}

/** Compute SLA info for a single message. Pure — no side effects. */
export function computeSla(message: Message, nowMs = Date.now()): SlaInfo {
  const receivedMs = new Date(message.received_at).getTime()

  const urgenza = message.dati_estratti?.grado_urgenza
  const slaTotalMs =
    (urgenza != null ? SLA_BY_URGENZA[urgenza] : undefined) ??
    (message.priority != null ? SLA_BY_PRIORITY[message.priority] : undefined) ??
    SLA_DEFAULT_MS

  const deadlineMs  = receivedMs + slaTotalMs
  const remainingMs = deadlineMs - nowMs

  const status: SlaStatus =
    remainingMs <= 0
      ? 'breach'
      : remainingMs / slaTotalMs < 0.25
        ? 'warning'
        : 'ok'

  return { deadlineMs, remainingMs, slaTotalMs, status }
}

/** Count active messages (not replied/archived) with a breached SLA. */
export function countSlaBreached(messages: Message[]): number {
  return messages.filter(
    (m) =>
      m.status !== 'replied' &&
      m.status !== 'archived' &&
      computeSla(m).status === 'breach',
  ).length
}

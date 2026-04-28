/**
 * Token Health system
 *
 * Computes a health state for each Kanban card based on:
 *
 *   critical — grado_urgenza is 'alta' or 'critica' in dati_estratti,
 *              OR the message subject/body contains critical logistics keywords.
 *              → red pulsing border
 *
 *   warning  — message is in 'in_progress' status for more than 4 hours
 *              without having been replied to.
 *              → static orange border
 *
 *   ok       — everything else
 *              → default card appearance
 */

import type { Message } from '@/types/database'
import { computeSla } from './sla'

export type TokenHealth = 'ok' | 'warning' | 'critical'

// Keywords that signal a critical operational situation
const CRITICAL_KEYWORDS = [
  'ritardo', 'ritardi',
  'danno', 'danni',
  'fermo', 'ferma', 'fermi',
  'penale', 'penali',
  'urgente', 'urgenti', 'urgenza',
  'bloccato', 'bloccata', 'bloccati',
]

const IN_PROGRESS_WARNING_MS = 4 * 60 * 60 * 1000   // 4 hours

/** Returns the health state for a single message. Pure — no async, no side effects. */
export function computeTokenHealth(message: Message): TokenHealth {
  // ── Critical: AI-detected urgency level ──────────────────────────────────
  const urgenza = message.dati_estratti?.grado_urgenza
  if (urgenza === 'alta' || urgenza === 'critica') return 'critical'

  // ── Critical: keyword match in subject or body ────────────────────────────
  const textLower = `${message.subject} ${message.body ?? ''}`.toLowerCase()
  if (CRITICAL_KEYWORDS.some((kw) => textLower.includes(kw))) return 'critical'

  // ── Warning: stale in-progress ────────────────────────────────────────────
  if (message.status === 'in_progress') {
    const ageMs = Date.now() - new Date(message.received_at).getTime()
    if (ageMs > IN_PROGRESS_WARNING_MS) return 'warning'
  }

  // ── Critical/Warning: SLA status ──────────────────────────────────────────
  if (message.status === 'arrived' || message.status === 'in_progress') {
    const sla = computeSla(message)
    if (sla.status === 'breach')  return 'critical'
    if (sla.status === 'warning') return 'warning'
  }

  return 'ok'
}

/** Convenience: count critical messages across any list. */
export function countCritical(messages: Message[]): number {
  return messages.filter((m) => computeTokenHealth(m) === 'critical').length
}

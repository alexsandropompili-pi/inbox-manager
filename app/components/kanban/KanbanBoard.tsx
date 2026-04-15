'use client'

import { Fragment, useState, useTransition } from 'react'
import type { Message, KanbanStatus } from '@/types/database'
import { KanbanColumn } from './KanbanColumn'
import { MessageDetail } from '@/app/components/message/MessageDetail'
import { moveMessageAction } from '@/app/actions/messages'

type Columns = Record<KanbanStatus, Message[]>

const KANBAN_STATUSES: KanbanStatus[] = ['unread', 'read', 'replied']

// ─── Demo messages — shown when the database has no messages yet ───────────────

const DEMO_MESSAGES: Message[] = [
  // ── Arrivato ──
  {
    id: 'demo-1',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-1',
    thread_id: null,
    subject: 'Richiesta di preventivo per licenze enterprise',
    body: 'Buongiorno, siamo interessati a un piano enterprise per 50 utenti. Potete inviarci un preventivo dettagliato con le opzioni disponibili?',
    from_email: 'marco.ferrari@techcorp.it',
    from_name: 'Marco Ferrari',
    to_email: 'info@azienda.com',
    status: 'unread',
    priority: 'high',
    channel: 'email',
    received_at: '2026-04-15T09:14:00.000Z',
    created_at: '2026-04-15T09:14:00.000Z',
  },
  {
    id: 'demo-2',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-2',
    thread_id: null,
    subject: 'Problema urgente con integrazione API',
    body: 'Ciao, da stamattina l\'integrazione con il vostro servizio non funziona. Restituisce errore 503. È urgente perché blocca la produzione.',
    from_email: 'sofia.chen@startupxyz.com',
    from_name: 'Sofia Chen',
    to_email: 'supporto@azienda.com',
    status: 'unread',
    priority: 'high',
    channel: 'whatsapp',
    received_at: '2026-04-15T08:47:00.000Z',
    created_at: '2026-04-15T08:47:00.000Z',
  },
  {
    id: 'demo-3',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-3',
    thread_id: null,
    subject: 'Feedback sul nuovo modulo di reportistica',
    body: 'Ho avuto modo di testare il nuovo modulo. In generale molto positivo, ma avrei qualche suggerimento sulla visualizzazione dei grafici.',
    from_email: 'luca.rossi@cliente.it',
    from_name: 'Luca Rossi',
    to_email: 'feedback@azienda.com',
    status: 'unread',
    priority: 'medium',
    channel: 'email',
    received_at: '2026-04-14T17:22:00.000Z',
    created_at: '2026-04-14T17:22:00.000Z',
  },
  {
    id: 'demo-4',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-4',
    thread_id: null,
    subject: 'Aggiornamento contratto annuale',
    body: 'Come da accordi, vi invio la documentazione aggiornata per il rinnovo contrattuale. Attendo conferma di ricezione.',
    from_email: 'anna.bianchi@partner.com',
    from_name: 'Anna Bianchi',
    to_email: 'amministrazione@azienda.com',
    status: 'unread',
    priority: 'low',
    channel: 'email',
    received_at: '2026-04-14T11:05:00.000Z',
    created_at: '2026-04-14T11:05:00.000Z',
  },
  // ── In svolgimento ──
  {
    id: 'demo-5',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-5',
    thread_id: null,
    subject: 'Demo prodotto confermata per venerdì 18',
    body: 'Confermo la call di venerdì alle 15:00. Parteciperà anche il nostro CTO. Può inviarci l\'agenda della demo in anticipo?',
    from_email: 'pietro.verdi@bigclient.it',
    from_name: 'Pietro Verdi',
    to_email: 'sales@azienda.com',
    status: 'read',
    priority: 'medium',
    channel: 'email',
    received_at: '2026-04-13T14:30:00.000Z',
    created_at: '2026-04-13T14:30:00.000Z',
  },
  {
    id: 'demo-6',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-6',
    thread_id: null,
    subject: 'Domanda sul piano Pro: limite utenti',
    body: 'Ciao! Stavo valutando il piano Pro. Il limite di 10 utenti è espandibile? Siamo un team di 12 persone.',
    from_email: 'elena.marino@studio.it',
    from_name: 'Elena Marino',
    to_email: 'info@azienda.com',
    status: 'read',
    priority: 'low',
    channel: 'whatsapp',
    received_at: '2026-04-13T10:18:00.000Z',
    created_at: '2026-04-13T10:18:00.000Z',
  },
  {
    id: 'demo-7',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-7',
    thread_id: null,
    subject: 'Report mensile Q1 2026 — richiesta revisione',
    body: 'Allego il report Q1 per la vostra revisione prima della presentazione al board. Qualche numero non mi torna nella sezione conversioni.',
    from_email: 'giacomo.conti@holding.it',
    from_name: 'Giacomo Conti',
    to_email: 'analytics@azienda.com',
    status: 'read',
    priority: 'high',
    channel: 'email',
    received_at: '2026-04-12T16:55:00.000Z',
    created_at: '2026-04-12T16:55:00.000Z',
  },
  // ── Concluso ──
  {
    id: 'demo-8',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-8',
    thread_id: null,
    subject: 'Onboarding completato — benvenuto a bordo!',
    body: 'Il vostro account è ora attivo. Trovate tutta la documentazione nel portale. Il vostro customer success manager si metterà in contatto entro 24 ore.',
    from_email: 'onboarding@platform.com',
    from_name: 'Team Onboarding',
    to_email: 'info@azienda.com',
    status: 'replied',
    priority: 'low',
    channel: 'email',
    received_at: '2026-04-11T09:00:00.000Z',
    created_at: '2026-04-11T09:00:00.000Z',
  },
  {
    id: 'demo-9',
    company_id: 'demo',
    email_account_id: 'demo',
    external_message_id: 'demo-9',
    thread_id: null,
    subject: 'Rinnovo abbonamento — conferma pagamento',
    body: 'Il rinnovo dell\'abbonamento annuale è stato elaborato con successo. La fattura è disponibile nella sezione "Fatturazione" del vostro account.',
    from_email: 'billing@platform.com',
    from_name: 'Team Fatturazione',
    to_email: 'amministrazione@azienda.com',
    status: 'replied',
    priority: 'medium',
    channel: 'email',
    received_at: '2026-04-10T13:42:00.000Z',
    created_at: '2026-04-10T13:42:00.000Z',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const seed = initialMessages.length === 0 ? DEMO_MESSAGES : initialMessages

  const [columns, setColumns] = useState<Columns>(() => groupByStatus(seed))
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [, startTransition] = useTransition()
  const isDemo = initialMessages.length === 0

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

    if (isDemo) return  // demo cards: UI-only, skip server action

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
    <div className="flex h-full flex-col bg-zinc-900">
      {/* Dashboard header */}
      <header className="shrink-0 border-b border-white/[0.06] bg-zinc-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-white">InboxManager</h1>
              {isDemo && (
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-300 ring-1 ring-inset ring-amber-500/30">
                  Demo
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-zinc-500">
              {isDemo ? 'Dati di esempio — collega il tuo account per iniziare' : `${totalMessages} messaggi totali`}
            </p>
          </div>

          {/* Stats chips */}
          <div className="hidden items-center gap-2 sm:flex">
            <Chip label="Arrivati"       count={columns.unread.length}  color="blue" />
            <Chip label="In svolgimento" count={columns.read.length}    color="amber" />
            <Chip label="Conclusi"       count={columns.replied.length} color="emerald" />
          </div>
        </div>
      </header>

      {/* Kanban columns */}
      <main className="flex flex-1 overflow-x-auto px-5 py-5">
        {KANBAN_STATUSES.map((status, index) => (
          <Fragment key={status}>
            {/* Vertical divider between columns */}
            {index > 0 && (
              <div className="mx-4 w-px shrink-0 self-stretch rounded-full bg-white/[0.06]" />
            )}
            <KanbanColumn
              status={status}
              messages={columns[status]}
              pendingIds={pendingIds}
              onDrop={handleDrop}
              onSelectMessage={setSelectedMessage}
            />
          </Fragment>
        ))}
      </main>

      {selectedMessage && (
        <MessageDetail
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
          onStatusChange={handleMessageStatusChange}
          isDemo={isDemo}
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
    blue:    'bg-blue-500/10 text-blue-300 ring-blue-500/30',
    amber:   'bg-amber-500/10 text-amber-300 ring-amber-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
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

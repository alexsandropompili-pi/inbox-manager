'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import type { Message, KanbanStatus, AiResponse, MessagePriority, MessageChannel } from '@/types/database'
import type { Operator } from '@/lib/team'
import { findOperator } from '@/lib/team'
import { ConfirmDialog } from './ConfirmDialog'
import {
  getResponseHistoryAction,
  approveAndSendAction,
  rejectResponseAction,
} from '@/app/actions/ai-responses'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_LABEL: Record<MessagePriority, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Bassa',
}

const PRIORITY_COLOR: Record<MessagePriority, string> = {
  high: 'bg-red-50 text-red-700 ring-red-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  low: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

const CHANNEL_ICON: Record<MessageChannel, string> = {
  email: '✉',
  whatsapp: '💬',
}

function formatFull(iso: string) {
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function formatShort(iso: string) {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

// ─── AI response history item ─────────────────────────────────────────────────

function HistoryItem({ item }: { item: AiResponse }) {
  const [expanded, setExpanded] = useState(false)

  const statusStyles: Record<AiResponse['status'], string> = {
    sent:     'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected: 'bg-red-50 text-red-700 ring-red-200',
    draft:    'bg-zinc-100 text-zinc-600 ring-zinc-200',
  }
  const statusLabel: Record<AiResponse['status'], string> = {
    sent: 'Inviata', rejected: 'Rifiutata', draft: 'Bozza',
  }

  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className={[
            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
            statusStyles[item.status],
          ].join(' ')}
        >
          {statusLabel[item.status]}
        </span>
        <span className="text-xs text-zinc-400" suppressHydrationWarning>
          {formatShort(item.created_at)}
        </span>
      </div>
      <p
        className={['mt-2 text-xs text-zinc-600 leading-relaxed', expanded ? '' : 'line-clamp-3'].join(' ')}
      >
        {item.content}
      </p>
      {item.content.length > 180 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs text-blue-600 hover:underline"
        >
          {expanded ? 'Mostra meno' : 'Mostra tutto'}
        </button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  message:        Message
  onClose:        () => void
  onStatusChange: (messageId: string, newStatus: KanbanStatus) => void
  onAssign:       (messageId: string, assignedTo: string | null) => void
  operators:      Operator[]
}

export function MessageDetail({
  message, onClose, onStatusChange, onAssign, operators,
}: Props) {
  const [draft, setDraft] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [history, setHistory] = useState<AiResponse[]>([])
  const [confirmMode, setConfirmMode] = useState<'approve' | 'reject' | null>(null)
  const [, startTransition] = useTransition()

  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load history on mount / whenever message changes
  useEffect(() => {
    getResponseHistoryAction(message.id).then(setHistory).catch(console.error)
  }, [message.id])

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [draft])

  // Abort any in-flight stream when the panel closes
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  async function handleGenerate() {
    if (isStreaming) {
      abortRef.current?.abort()
      return
    }

    setDraft('')
    setIsStreaming(true)

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/ai/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: ctrl.signal,
      })

      if (!res.ok || !res.body) throw new Error(`Errore HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let accumulated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setDraft(accumulated)
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Streaming error:', err)
      }
    } finally {
      setIsStreaming(false)
    }
  }

  function handleApproveClick() {
    if (!draft.trim()) return
    setConfirmMode('approve')
  }

  function handleRejectClick() {
    if (!draft.trim()) return
    setConfirmMode('reject')
  }

  function handleConfirm() {
    const mode = confirmMode
    setConfirmMode(null)

    startTransition(async () => {
      try {
        if (mode === 'approve') {
          await approveAndSendAction(message.id, message.company_id, draft)
          setDraft('')
          onStatusChange(message.id, 'read')
        } else if (mode === 'reject') {
          await rejectResponseAction(message.id, message.company_id, draft)
          setDraft('')
        }
        const updated = await getResponseHistoryAction(message.id)
        setHistory(updated)
      } catch (err) {
        console.error(err)
      }
    })
  }

  const channel = message.channel ?? 'email'
  const hasDraft = draft.trim().length > 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-900 line-clamp-1">
            {message.subject}
          </h2>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">

          {/* Message meta */}
          <section>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                <span>{CHANNEL_ICON[channel]}</span>
                {channel === 'email' ? 'Email' : 'WhatsApp'}
              </span>
              {message.priority && (
                <span
                  className={[
                    'inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                    PRIORITY_COLOR[message.priority],
                  ].join(' ')}
                >
                  Priorità {PRIORITY_LABEL[message.priority]}
                </span>
              )}
              <span className="text-xs text-zinc-400 ml-auto" suppressHydrationWarning>
                {formatFull(message.received_at)}
              </span>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="font-medium text-zinc-500">Da</dt>
              <dd className="text-zinc-800">
                {message.from_name
                  ? `${message.from_name} <${message.from_email}>`
                  : message.from_email}
              </dd>
              <dt className="font-medium text-zinc-500">A</dt>
              <dd className="text-zinc-800">{message.to_email}</dd>
              <dt className="font-medium text-zinc-500">Oggetto</dt>
              <dd className="text-zinc-800 font-medium">{message.subject}</dd>
            </dl>
          </section>

          {/* Logistics Token */}
          {message.token_code && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Logistics Token
              </h3>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <p className="mb-3 font-mono text-base font-bold tracking-widest text-zinc-800">
                  {message.token_code}
                </p>
                <div className="flex flex-wrap gap-2">
                  {message.notion_1 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                      {message.notion_1}
                    </span>
                  )}
                  {message.notion_2 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      {message.notion_2}
                    </span>
                  )}
                  {message.notion_3 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                      {message.notion_3}
                    </span>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Assignment */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Assegna a
            </h3>
            <div className="flex flex-wrap gap-2">
              {operators.map((op) => {
                const isSelected = message.assigned_to === op.id
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => onAssign(message.id, isSelected ? null : op.id)}
                    className={[
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
                      'border transition-all duration-150',
                      isSelected
                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-200'
                        : 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex h-5 w-5 items-center justify-center rounded-full',
                        'text-[9px] font-bold text-white',
                        op.color,
                      ].join(' ')}
                    >
                      {op.initials}
                    </span>
                    {op.name}
                    {isSelected && (
                      <svg className="ml-0.5 h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                )
              })}
              {message.assigned_to && (
                <button
                  type="button"
                  onClick={() => onAssign(message.id, null)}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-700/50 px-3 py-2 text-xs text-zinc-600 transition-colors hover:border-zinc-600 hover:text-zinc-400"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Rimuovi
                </button>
              )}
            </div>
            {!message.assigned_to && (
              <p className="mt-2 text-xs text-zinc-600">Nessun operatore assegnato</p>
            )}
          </section>

          {/* Message body */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Corpo del messaggio
            </h3>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap min-h-20">
              {message.body || (
                <span className="italic text-zinc-400">Nessun corpo disponibile.</span>
              )}
            </div>
          </section>

          {/* AI generation */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Risposta AI
              </h3>
              <button
                onClick={handleGenerate}
                disabled={false}
                className={[
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  isStreaming
                    ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700',
                ].join(' ')}
              >
                {isStreaming ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Interrompi
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    {hasDraft ? 'Rigenera' : 'Genera risposta AI'}
                  </>
                )}
              </button>
            </div>

            {/* Editable draft textarea */}
            {(hasDraft || isStreaming) && (
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={isStreaming}
                  rows={6}
                  className={[
                    'w-full resize-none rounded-xl border px-4 py-3 text-sm leading-relaxed text-zinc-800',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500',
                    isStreaming
                      ? 'border-blue-200 bg-blue-50/50 text-zinc-600'
                      : 'border-zinc-200 bg-white',
                  ].join(' ')}
                  placeholder="La risposta AI apparirà qui…"
                />
                {isStreaming && (
                  <span className="absolute bottom-3 right-3 flex items-center gap-1 text-xs text-blue-500">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                    generando…
                  </span>
                )}
              </div>
            )}

            {/* Action buttons */}
            {hasDraft && !isStreaming && (
              <div className="mt-3 flex gap-3">
                <button
                  onClick={handleApproveClick}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  Approva e invia
                </button>
                <button
                  onClick={handleRejectClick}
                  className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  Rifiuta
                </button>
              </div>
            )}
          </section>

          {/* History */}
          {history.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Storico risposte ({history.length})
              </h3>
              <div className="flex flex-col gap-2">
                {history.map((item) => (
                  <HistoryItem key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}
        </div>
      </aside>

      {/* Confirmation dialog */}
      {confirmMode === 'approve' && (
        <ConfirmDialog
          title="Approva e invia la risposta?"
          description="La risposta verrà inviata al mittente e il messaggio sarà spostato in 'Concluso'. Assicurati di aver revisionato il testo prima di procedere."
          confirmLabel="Approva e invia"
          cancelLabel="Torna alla revisione"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmMode(null)}
        />
      )}
      {confirmMode === 'reject' && (
        <ConfirmDialog
          title="Rifiutare la risposta generata?"
          description="La risposta verrà salvata come rifiutata nello storico e il draft verrà eliminato. Potrai generarne una nuova."
          confirmLabel="Rifiuta"
          cancelLabel="Annulla"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmMode(null)}
        />
      )}
    </>
  )
}

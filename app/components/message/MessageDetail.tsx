'use client'

import { useState, useEffect, useRef, useTransition, useMemo, useCallback } from 'react'
import type { Message, KanbanStatus, AiResponse, Spedizione } from '@/types/database'
import { ConfirmDialog } from './ConfirmDialog'
import {
  getResponseHistoryAction,
  approveAndSendAction,
  rejectResponseAction,
} from '@/app/actions/ai-responses'
import { getClientHistoryAction, getThreadMessagesAction } from '@/app/actions/messages'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

function formatDay(iso: string) {
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso))
}

function formatShort(iso: string) {
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function getInitials(name: string | null, email: string) {
  const src = name ?? email
  return src.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

// ─── Streaming helper ─────────────────────────────────────────────────────────

async function streamAiResponse(
  message: Message,
  spedizione: Spedizione | null,
  signal: AbortSignal,
  onChunk: (text: string) => void,
) {
  const res = await fetch('/api/ai/generate-response', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, spedizione }),
    signal,
  })
  if (!res.ok || !res.body) throw new Error(`Errore HTTP ${res.status}`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let accumulated = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    accumulated += decoder.decode(value, { stream: true })
    onChunk(accumulated)
  }
}

// ─── Spedizione card (compact) ────────────────────────────────────────────────

function SpedizioneCard({ spedizione }: { spedizione: Spedizione }) {
  const STATO_COLOR: Record<string, string> = {
    'In transito': 'bg-blue-50 text-blue-700 ring-blue-200',
    'Consegnato':  'bg-emerald-50 text-emerald-700 ring-emerald-200',
    'Ritardo':     'bg-amber-50 text-amber-700 ring-amber-200',
    'In attesa':   'bg-zinc-100 text-zinc-600 ring-zinc-200',
    'Fermo':       'bg-red-50 text-red-700 ring-red-200',
  }
  const statoColor = STATO_COLOR[spedizione.stato] ?? 'bg-zinc-100 text-zinc-600 ring-zinc-200'
  return (
    <div className="mx-4 rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V11" />
          </svg>
          <span className="font-mono text-xs font-bold tracking-widest text-indigo-900">{spedizione.numero}</span>
        </div>
        <span className={['inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', statoColor].join(' ')}>
          {spedizione.stato}
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
        {spedizione.posizione_attuale && (
          <><dt className="font-medium text-indigo-400">Posizione</dt><dd className="text-indigo-800">{spedizione.posizione_attuale}</dd></>
        )}
        {spedizione.data_prevista_consegna && (
          <><dt className="font-medium text-indigo-400">Consegna</dt><dd className="text-indigo-800 font-medium">{new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(new Date(spedizione.data_prevista_consegna))}</dd></>
        )}
        {spedizione.destinatario && (
          <><dt className="font-medium text-indigo-400">Destinatario</dt><dd className="text-indigo-800">{spedizione.destinatario}</dd></>
        )}
      </dl>
    </div>
  )
}

// ─── Chat bubbles ─────────────────────────────────────────────────────────────

function ClientBubble({ message, showName }: { message: Message; showName: boolean }) {
  return (
    <div className="flex items-end gap-2 pr-16">
      {showName && (
        <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-slate-500 text-[10px] font-bold text-white">
          {getInitials(message.from_name, message.from_email)}
        </div>
      )}
      {!showName && <div className="w-7 shrink-0" />}
      <div className="group flex flex-col gap-1">
        <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 shadow-sm ring-1 ring-zinc-100">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{message.body}</p>
        </div>
        <span className="ml-1 text-[10px] text-zinc-400" suppressHydrationWarning>
          {formatTime(message.received_at)}
        </span>
      </div>
    </div>
  )
}

function OperatorBubble({ response }: { response: AiResponse }) {
  return (
    <div className="flex items-end justify-end gap-2 pl-16">
      <div className="flex flex-col items-end gap-1">
        <div className="rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 shadow-sm">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">{response.final_text ?? response.generated_text}</p>
        </div>
        <div className="flex items-center gap-1 mr-1">
          <span className="text-[10px] text-zinc-400" suppressHydrationWarning>
            {formatTime(response.created_at)}
          </span>
          <svg className="h-3 w-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
        AI
      </div>
    </div>
  )
}

function DaySeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-zinc-200" />
      <span className="rounded-full bg-zinc-100 px-3 py-0.5 text-[10px] font-medium text-zinc-400">
        {formatDay(date)}
      </span>
      <div className="h-px flex-1 bg-zinc-200" />
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-end justify-end gap-2 pl-16">
      <div className="rounded-2xl rounded-tr-sm bg-indigo-100 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
      <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
        AI
      </div>
    </div>
  )
}

// ─── Storico overlay ──────────────────────────────────────────────────────────

function StoricoOverlay({
  tickets,
  loading,
  clientName,
  onClose,
}: {
  tickets: Message[]
  loading: boolean
  clientName: string
  onClose: () => void
}) {
  const STATUS_LABEL: Record<string, string> = {
    arrived: 'Arrivato', in_progress: 'In lavorazione', replied: 'Concluso', archived: 'Archiviato',
  }
  const STATUS_COLOR: Record<string, string> = {
    arrived: 'bg-blue-50 text-blue-700 ring-blue-200',
    in_progress: 'bg-amber-50 text-amber-700 ring-amber-200',
    replied: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    archived: 'bg-zinc-100 text-zinc-500 ring-zinc-200',
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3.5">
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Chiudi storico"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <p className="text-sm font-semibold text-zinc-900">Storico ticket</p>
          <p className="text-xs text-zinc-400">{clientName}</p>
        </div>
        {!loading && tickets.length > 0 && (
          <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
            {tickets.length}
          </span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                <div className="h-2 w-20 rounded-full bg-zinc-200" />
                <div className="h-3 w-full rounded-full bg-zinc-200" />
                <div className="h-3 w-3/4 rounded-full bg-zinc-200" />
              </div>
            ))}
          </>
        )}

        {!loading && tickets.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
              <svg className="h-5 w-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-400">Nessun ticket precedente</p>
          </div>
        )}

        {!loading && tickets.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 transition-colors hover:border-zinc-200 hover:bg-white"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-[10px] text-zinc-400" suppressHydrationWarning>
                {formatShort(t.received_at)}
              </span>
              <span className={['inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset', STATUS_COLOR[t.status] ?? 'bg-zinc-100 text-zinc-500 ring-zinc-200'].join(' ')}>
                {STATUS_LABEL[t.status] ?? t.status}
              </span>
            </div>
            <p className="line-clamp-2 text-sm font-medium text-zinc-700 leading-snug">{t.subject}</p>
            {t.token_code && (
              <p className="mt-1.5 font-mono text-[10px] font-semibold tracking-widest text-indigo-400">{t.token_code}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  message:        Message
  onClose:        () => void
  onStatusChange: (messageId: string, newStatus: KanbanStatus) => void
}

export function MessageDetail({ message, onClose, onStatusChange }: Props) {
  const [threadMessages, setThreadMessages]   = useState<Message[]>([message])
  const [threadLoading, setThreadLoading]     = useState(true)
  const [threadResponses, setThreadResponses] = useState<Map<string, AiResponse[]>>(new Map())

  const [draft, setDraft]             = useState('')
  const [isStreaming, setIsStreaming]  = useState(false)
  const [isSending, setIsSending]     = useState(false)
  const [confirmMode, setConfirmMode] = useState<'approve' | 'reject' | null>(null)
  const [sendError, setSendError]     = useState<string | null>(null)

  const [spedizione, setSpedizione]             = useState<Spedizione | null | undefined>(undefined)
  const [spedizioneNumero, setSpedizioneNumero] = useState<string | null>(null)

  const [showStorico, setShowStorico]   = useState(false)
  const [clientHistory, setClientHistory] = useState<Message[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [, startTransition]  = useTransition() // eslint-disable-line @typescript-eslint/no-unused-vars
  const abortRef             = useRef<AbortController | null>(null)
  const chatEndRef           = useRef<HTMLDivElement>(null)
  const autoGeneratedForId   = useRef<string | null>(null)

  // Last message in thread — the one we reply to
  const activeMessage = useMemo(
    () => threadMessages[threadMessages.length - 1],
    [threadMessages],
  )

  // ── Load thread ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setThreadLoading(true)
    getThreadMessagesAction(message.id)
      .then((thread) => setThreadMessages(thread.length > 0 ? thread : [message]))
      .catch(console.error)
      .finally(() => setThreadLoading(false))
  }, [message.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load sent AI responses for each thread message ──────────────────────────
  useEffect(() => {
    const load = async () => {
      const map = new Map<string, AiResponse[]>()
      await Promise.all(
        threadMessages.map(async (msg) => {
          const all = await getResponseHistoryAction(msg.id)
          map.set(msg.id, all.filter((r) => r.review_status === 'sent').reverse())
        }),
      )
      setThreadResponses(new Map(map))
    }
    load().catch(console.error)
  }, [threadMessages])

  // ── Load spedizione for active (last) message ───────────────────────────────
  useEffect(() => {
    setSpedizione(undefined)
    setSpedizioneNumero(null)
    setDraft('')
    autoGeneratedForId.current = null
    fetch('/api/spedizioni/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: activeMessage.subject, body: activeMessage.body }),
    })
      .then((r) => r.json())
      .then(({ numero, spedizione: found }: { numero: string | null; spedizione: Spedizione | null }) => {
        setSpedizioneNumero(numero)
        setSpedizione(found ?? null)
      })
      .catch(() => setSpedizione(null))
  }, [activeMessage.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-generate AI response once spedizione is resolved ───────────────────
  useEffect(() => {
    if (spedizione === undefined) return
    if (autoGeneratedForId.current === activeMessage.id) return
    autoGeneratedForId.current = activeMessage.id

    const ctrl = new AbortController()
    abortRef.current = ctrl
    setDraft('')
    setIsStreaming(true)

    streamAiResponse(activeMessage, spedizione, ctrl.signal, setDraft)
      .catch((err) => { if ((err as Error).name !== 'AbortError') console.error('AI stream error:', err) })
      .finally(() => setIsStreaming(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spedizione])

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  useEffect(() => () => { abortRef.current?.abort() }, [])

  // ── Scroll to bottom when chat updates ──────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadMessages, threadResponses, isStreaming])

  // ── Build timeline ───────────────────────────────────────────────────────────
  type TimelineItem =
    | { type: 'day'; date: string; key: string }
    | { type: 'client'; message: Message; showName: boolean }
    | { type: 'operator'; response: AiResponse }

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = []
    let prevDate: string | null = null

    for (let i = 0; i < threadMessages.length; i++) {
      const msg = threadMessages[i]

      // Day separator
      if (!prevDate || !isSameDay(prevDate, msg.received_at)) {
        items.push({ type: 'day', date: msg.received_at, key: `day-${msg.id}` })
        prevDate = msg.received_at
      }

      items.push({ type: 'client', message: msg, showName: i === 0 })

      // Sent responses for this message
      const responses = threadResponses.get(msg.id) ?? []
      for (const r of responses) {
        if (!isSameDay(prevDate ?? r.created_at, r.created_at)) {
          items.push({ type: 'day', date: r.created_at, key: `day-r-${r.id}` })
        }
        prevDate = r.created_at
        items.push({ type: 'operator', response: r })
      }
    }

    return items
  }, [threadMessages, threadResponses])

  // ── Storico ─────────────────────────────────────────────────────────────────
  const openStorico = useCallback(() => {
    setShowStorico(true)
    if (clientHistory.length === 0) {
      setHistoryLoading(true)
      getClientHistoryAction(message.company_id, message.from_email, message.id)
        .then(setClientHistory)
        .catch(console.error)
        .finally(() => setHistoryLoading(false))
    }
  }, [message.company_id, message.from_email, message.id, clientHistory.length])

  // ── Actions ─────────────────────────────────────────────────────────────────
  function handleRegenerate() {
    if (isStreaming) { abortRef.current?.abort(); return }
    if (spedizione === undefined) return
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setDraft('')
    setIsStreaming(true)
    streamAiResponse(activeMessage, spedizione, ctrl.signal, setDraft)
      .catch((err) => { if ((err as Error).name !== 'AbortError') console.error('AI stream error:', err) })
      .finally(() => setIsStreaming(false))
  }

  function handleApproveClick() { if (draft.trim()) setConfirmMode('approve') }
  function handleRejectClick()  { if (draft.trim()) setConfirmMode('reject') }

  async function handleConfirm() {
    const mode = confirmMode
    setConfirmMode(null)
    setSendError(null)
    setIsSending(true)
    try {
      if (mode === 'approve') {
        await approveAndSendAction(message.id, activeMessage.id, message.company_id, draft)
        setDraft('')
        onStatusChange(message.id, 'replied')
        const all = await getResponseHistoryAction(activeMessage.id)
        setThreadResponses((prev) => {
          const next = new Map(prev)
          next.set(activeMessage.id, all.filter((r) => r.review_status === 'sent').reverse())
          return next
        })
      } else if (mode === 'reject') {
        await rejectResponseAction(message.id, draft)
        setDraft('')
      }
    } catch (err) {
      console.error('[handleConfirm error]', err)
      setSendError(err instanceof Error ? err.message : 'Errore durante l\'invio')
    } finally {
      setIsSending(false)
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const displayName      = message.from_name ?? message.from_email
  const initials         = getInitials(message.from_name, message.from_email)
  const hasDraft         = draft.trim().length > 0
  const spedizioneReady  = spedizione !== undefined

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[680px] flex-col overflow-hidden bg-white shadow-2xl shadow-black/15 ring-1 ring-black/5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3">
          {/* Avatar */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-md shadow-indigo-200/50">
            {initials}
          </div>

          {/* Name + email */}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900" title={displayName}>
              {displayName}
            </p>
            <p className="truncate text-xs text-zinc-400" title={message.from_email}>
              {message.from_email}
            </p>
          </div>

          {/* Storico button */}
          <button
            onClick={openStorico}
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-medium text-zinc-500 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Storico
          </button>

          {/* Subject + token */}
          <div className="hidden sm:flex flex-col items-end shrink-0">
            {message.token_code && (
              <span className="font-mono text-[10px] font-semibold tracking-widest text-indigo-400">
                {message.token_code}
              </span>
            )}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Subject bar */}
        <div className="shrink-0 border-b border-zinc-100 bg-zinc-50 px-4 py-2">
          <p className="truncate text-xs font-medium text-zinc-500">{message.subject}</p>
        </div>

        {/* ── Chat area ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-[#f0f2f5] px-4 py-4">
          <div className="flex flex-col gap-2">

            {/* Loading skeletons */}
            {threadLoading && (
              <>
                <DaySeparator date={message.received_at} />
                <div className="animate-pulse flex items-end gap-2 pr-16">
                  <div className="h-7 w-7 rounded-full bg-zinc-300 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-20 rounded-2xl rounded-tl-sm bg-zinc-200" />
                    <div className="h-2 w-8 rounded-full bg-zinc-200" />
                  </div>
                </div>
                <div className="animate-pulse flex items-end justify-end gap-2 pl-16">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-16 rounded-2xl rounded-tr-sm bg-indigo-200" />
                    <div className="flex justify-end"><div className="h-2 w-8 rounded-full bg-zinc-200" /></div>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-indigo-300 shrink-0" />
                </div>
              </>
            )}

            {/* Timeline */}
            {!threadLoading && timeline.map((item) => {
              if (item.type === 'day') return <DaySeparator key={item.key} date={item.date} />
              if (item.type === 'client') return (
                <ClientBubble key={item.message.id} message={item.message} showName={item.showName} />
              )
              return <OperatorBubble key={item.response.id} response={item.response} />
            })}

            {/* AI typing indicator while streaming */}
            {isStreaming && <TypingIndicator />}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ── Spedizione card (if found) ───────────────────────────────────── */}
        {spedizioneReady && spedizioneNumero && (
          <div className="shrink-0 border-t border-zinc-100 bg-white py-3">
            {spedizione ? (
              <SpedizioneCard spedizione={spedizione} />
            ) : (
              <div className="mx-4 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-700">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Spedizione <span className="mx-1 font-mono font-semibold">{spedizioneNumero}</span> non trovata nel sistema
              </div>
            )}
          </div>
        )}

        {/* ── Bottom input area ────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-zinc-200 bg-white px-4 pb-4 pt-3">
          {!spedizioneReady ? (
            /* Loading state */
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-zinc-400">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Preparazione risposta AI…
            </div>
          ) : (
            <>
              {/* Error banner */}
              {sendError && (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-red-700">Errore invio email</p>
                    <p className="mt-0.5 text-[11px] text-red-600 break-all">{sendError}</p>
                  </div>
                  <button
                    onClick={() => setSendError(null)}
                    className="shrink-0 text-red-300 hover:text-red-500 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Label row */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] italic text-zinc-400">bozza generata da IA</span>
                <button
                  onClick={handleRegenerate}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 transition-colors hover:text-zinc-600"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isStreaming ? 'Interrompi' : 'Rigenera'}
                </button>
              </div>

              {/* Input row */}
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={isStreaming}
                  rows={4}
                  className={[
                    'flex-1 resize-none rounded-2xl border px-4 py-3 text-sm leading-relaxed text-zinc-800',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors',
                    isStreaming
                      ? 'border-indigo-200 bg-indigo-50/30 text-zinc-500'
                      : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300',
                  ].join(' ')}
                  placeholder="Risposta AI in preparazione…"
                />

                <div className="flex shrink-0 flex-col gap-2">
                  {/* Reject */}
                  {hasDraft && !isStreaming && (
                    <button
                      onClick={handleRejectClick}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500 active:scale-95"
                      title="Rifiuta bozza"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}

                  {/* Send */}
                  <button
                    onClick={handleApproveClick}
                    disabled={!hasDraft || isStreaming || isSending}
                    className={[
                      'flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-all active:scale-95',
                      hasDraft && !isStreaming && !isSending
                        ? 'bg-emerald-500 text-white shadow-emerald-200 hover:bg-emerald-600 hover:scale-105'
                        : 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none',
                    ].join(' ')}
                    title="Approva e invia"
                  >
                    {isSending ? (
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Storico overlay ──────────────────────────────────────────────── */}
        {showStorico && (
          <StoricoOverlay
            tickets={clientHistory}
            loading={historyLoading}
            clientName={displayName}
            onClose={() => setShowStorico(false)}
          />
        )}
      </aside>

      {/* Confirm dialogs */}
      {confirmMode === 'approve' && (
        <ConfirmDialog
          title="Approva e invia la risposta?"
          description="La risposta verrà inviata al mittente e il ticket spostato in 'Concluso'. Assicurati di aver revisionato il testo prima di procedere."
          confirmLabel="Approva e invia"
          cancelLabel="Torna alla revisione"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmMode(null)}
        />
      )}
      {confirmMode === 'reject' && (
        <ConfirmDialog
          title="Rifiutare la risposta generata?"
          description="La bozza verrà salvata come rifiutata nello storico. Potrai generarne una nuova."
          confirmLabel="Rifiuta"
          cancelLabel="Annulla"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmMode(null)}
        />
      )}
    </>
  )
}

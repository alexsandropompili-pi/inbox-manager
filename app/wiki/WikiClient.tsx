'use client'

import { useRef, useState, useTransition } from 'react'
import {
  getSourcesAction,
  uploadDocumentAction,
  processDocumentAction,
  deleteSourceAction,
} from '@/app/actions/wiki'
import type { KbRawSource, KbWikiPage } from '@/types/database'

// ─── Icons ────────────────────────────────────────────────────────────────────

function Icon({ d, className = 'h-4 w-4' }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

const ICONS = {
  upload:   'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
  document: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  cog:      'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  trash:    'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  check:    'M4.5 12.75l6 6 9-13.5',
  x:        'M6 18L18 6M6 6l12 12',
  book:     'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:    'bg-amber-50 text-amber-700 ring-amber-200',
    processing: 'bg-blue-50 text-blue-700 ring-blue-200',
    done:       'bg-emerald-50 text-emerald-700 ring-emerald-200',
    error:      'bg-red-50 text-red-700 ring-red-200',
  }
  const label: Record<string, string> = {
    pending: 'In attesa', processing: 'Elaborazione', done: 'Pronto', error: 'Errore',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {label[status] ?? status}
    </span>
  )
}

// ─── Source row ───────────────────────────────────────────────────────────────

function SourceRow({
  source,
  onProcess,
  onDelete,
  busy,
}: {
  source: KbRawSource
  onProcess: (id: string) => void
  onDelete: (id: string) => void
  busy: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <Icon d={ICONS.document} className="h-5 w-5 shrink-0 text-gray-400" />
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium text-gray-800">{source.original_name}</p>
        <p className="text-[11px] text-gray-400">
          {formatBytes(source.file_size)}
          {source.processed_at && ` · ${new Date(source.processed_at).toLocaleDateString('it-IT')}`}
          {source.pages_created > 0 && ` · ${source.pages_created} pagine create`}
        </p>
      </div>
      <StatusBadge status={source.status} />
      {source.status === 'pending' && (
        <button
          disabled={busy}
          onClick={() => onProcess(source.id)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
        >
          <Icon d={ICONS.cog} className="h-3.5 w-3.5" />
          Elabora
        </button>
      )}
      {source.status === 'error' && source.error_message && (
        <span className="max-w-[180px] truncate text-[11px] text-red-500" title={source.error_message}>
          {source.error_message}
        </span>
      )}
      <button
        disabled={busy}
        onClick={() => onDelete(source.id)}
        className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
        title="Elimina"
      >
        <Icon d={ICONS.trash} className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── Wiki page card ───────────────────────────────────────────────────────────

function WikiPageCard({ page, expanded, onToggle }: {
  page: KbWikiPage
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition"
      >
        <Icon d={ICONS.book} className="h-4 w-4 shrink-0 text-blue-500" />
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-gray-800">{page.title}</p>
          <p className="text-[11px] text-gray-400">
            {page.category && <span className="mr-2 text-gray-400">{page.category}</span>}
            v{page.version} · {new Date(page.updated_at).toLocaleDateString('it-IT')}
          </p>
        </div>
        <Icon
          d={expanded ? ICONS.x : 'M19.5 8.25l-7.5 7.5-7.5-7.5'}
          className="h-4 w-4 shrink-0 text-gray-400"
        />
      </button>
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-600 font-sans">
            {page.content}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  initialSources: KbRawSource[]
  initialPages: KbWikiPage[]
}

export function WikiClient({ initialSources, initialPages }: Props) {
  const [sources, setSources] = useState(initialSources)
  const [pages] = useState(initialPages)
  const [expandedPage, setExpandedPage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function flash(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    Array.from(files).forEach((file) => {
      const fd = new FormData()
      fd.set('file', file)
      startTransition(async () => {
        const res = await uploadDocumentAction(fd)
        if (res.ok) {
          flash(`"${file.name}" caricato`)
          const updated = await getSourcesAction()
          setSources(updated)
        } else {
          setError(res.error ?? 'Errore caricamento')
        }
      })
    })
  }

  function handleProcess(sourceId: string) {
    setError(null)
    startTransition(async () => {
      const res = await processDocumentAction(sourceId)
      if (res.ok) {
        flash('Documento elaborato nel wiki')
        setSources((prev) =>
          prev.map((s) => (s.id === sourceId ? { ...s, status: 'done' } : s)),
        )
      } else {
        setError(res.error ?? 'Errore elaborazione')
      }
    })
  }

  function handleDelete(sourceId: string) {
    setError(null)
    startTransition(async () => {
      await deleteSourceAction(sourceId)
      setSources((prev) => prev.filter((s) => s.id !== sourceId))
    })
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-white px-6 py-6">
      <div className="mx-auto w-full max-w-3xl space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Wiki aziendale</h1>
          <p className="mt-1 text-sm text-gray-500">
            Carica documenti per alimentare il wiki. L&apos;AI li elabora e genera pagine di conoscenza usate per le risposte automatiche.
          </p>
        </div>

        {/* Feedback */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Icon d={ICONS.x} className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <Icon d={ICONS.check} className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Upload area */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400">Carica documento</h2>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
            className={[
              'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-colors',
              dragging
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50',
            ].join(' ')}
          >
            <Icon d={ICONS.upload} className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              Trascina qui un file oppure{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-500 underline-offset-2 hover:underline"
              >
                sfoglia
              </button>
            </p>
            <p className="text-[11px] text-gray-400">PDF, TXT, MD, CSV · max 10 MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.csv"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </section>

        {/* Documents list */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400">
            Documenti caricati
            <span className="ml-2 font-normal normal-case tracking-normal text-gray-400">({sources.length})</span>
          </h2>
          {sources.length === 0 ? (
            <p className="text-sm text-gray-400">Nessun documento ancora caricato.</p>
          ) : (
            <div className="space-y-2">
              {sources.map((s) => (
                <SourceRow
                  key={s.id}
                  source={s}
                  onProcess={handleProcess}
                  onDelete={handleDelete}
                  busy={isPending}
                />
              ))}
            </div>
          )}
        </section>

        {/* Wiki pages */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400">
            Pagine wiki
            <span className="ml-2 font-normal normal-case tracking-normal text-gray-400">({pages.length})</span>
          </h2>
          {pages.length === 0 ? (
            <p className="text-sm text-gray-400">Nessuna pagina ancora generata. Carica un documento e clicca &ldquo;Elabora&rdquo;.</p>
          ) : (
            <div className="space-y-2">
              {pages.map((p) => (
                <WikiPageCard
                  key={p.id}
                  page={p}
                  expanded={expandedPage === p.id}
                  onToggle={() => setExpandedPage(expandedPage === p.id ? null : p.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

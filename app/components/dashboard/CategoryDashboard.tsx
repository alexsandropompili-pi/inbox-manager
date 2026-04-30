'use client'

import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryData {
  notion: string
  count: number
  arrived: number
  in_progress: number
}

interface Props {
  categories: CategoryData[]
  stats: {
    total: number
    arrived: number
    in_progress: number
    replied: number
  }
  userEmail: string
}

// ─── Folder icon ──────────────────────────────────────────────────────────────

function FolderIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  )
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-2xl font-bold tabular-nums tracking-tight text-white">{value}</span>
      <span className="text-[11px] text-zinc-500">{label}</span>
    </div>
  )
}

// ─── Category card ────────────────────────────────────────────────────────────

function CategoryCard({ notion, count, arrived, in_progress }: CategoryData) {
  const pending = arrived + in_progress
  const isEmpty = count === 0

  return (
    <Link
      href={`/?category=${encodeURIComponent(notion)}`}
      className={[
        'group relative flex flex-col justify-between gap-4 rounded-2xl p-5',
        'border transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/50 active:translate-y-0 active:shadow-none',
        isEmpty
          ? 'border-white/[0.04] bg-zinc-900/40 cursor-default opacity-60'
          : 'border-white/[0.07] bg-zinc-900 cursor-pointer hover:border-white/[0.14] hover:bg-zinc-800/80',
      ].join(' ')}
    >
      {/* Top row: count + icon */}
      <div className="flex items-start justify-between">
        <span
          className={[
            'text-4xl font-bold tabular-nums tracking-tight leading-none',
            isEmpty ? 'text-zinc-700' : 'text-white',
          ].join(' ')}
        >
          {count}
        </span>
        <div
          className={[
            'rounded-xl p-2 transition-colors duration-200',
            isEmpty
              ? 'bg-white/[0.03] text-zinc-700'
              : 'bg-white/[0.06] text-zinc-400 group-hover:bg-white/[0.10] group-hover:text-zinc-200',
          ].join(' ')}
        >
          <FolderIcon />
        </div>
      </div>

      {/* Bottom row: name + subtitle */}
      <div>
        <p
          className={[
            'text-sm font-semibold leading-snug',
            isEmpty ? 'text-zinc-600' : 'text-zinc-100',
          ].join(' ')}
        >
          {notion}
        </p>
        <p
          className={[
            'mt-1 text-[11px]',
            pending > 0 ? 'text-amber-400/80' : 'text-zinc-600',
          ].join(' ')}
        >
          {pending > 0 ? `${pending} da gestire` : 'Tutto gestito'}
        </p>
      </div>
    </Link>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CategoryDashboard({ categories, stats, userEmail }: Props) {
  const today = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const userInitial = userEmail.charAt(0).toUpperCase()

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-zinc-950">

      {/* ── Header ── */}
      <header className="shrink-0 border-b border-white/[0.05] bg-zinc-950/80 px-8 py-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Ciao, {userInitial}</h1>
            <p className="mt-0.5 text-sm text-zinc-500 capitalize">{today}</p>
          </div>

          {/* Quick stats */}
          <div className="hidden items-center gap-8 divide-x divide-white/[0.06] sm:flex">
            <StatPill label="Totale" value={stats.total} />
            <div className="pl-8">
              <StatPill label="Da gestire" value={stats.arrived} />
            </div>
            <div className="pl-8">
              <StatPill label="In lavorazione" value={stats.in_progress} />
            </div>
            <div className="pl-8">
              <StatPill label="Gestiti" value={stats.replied} />
            </div>
          </div>
        </div>
      </header>

      {/* ── Category grid ── */}
      <section className="flex-1 px-8 py-7">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-zinc-900">
              <FolderIcon />
            </div>
            <p className="text-sm font-medium text-zinc-400">Nessun messaggio ancora ricevuto</p>
            <p className="mt-1 text-xs text-zinc-700">
              Le categorie appariranno automaticamente non appena arrivano le email.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
              {categories.length} {categories.length === 1 ? 'categoria' : 'categorie'}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {categories.map((cat) => (
                <CategoryCard key={cat.notion} {...cat} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

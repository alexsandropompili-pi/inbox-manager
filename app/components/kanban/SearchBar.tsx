'use client'

import Link from 'next/link'
import type { MessageChannel, MessagePriority } from '@/types/database'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ChannelFilter  = MessageChannel | 'all'
export type PriorityFilter = MessagePriority | 'all'
export type DateFilter     = 'today' | '7d' | '30d' | 'all'

export interface Filters {
  query:    string
  channel:  ChannelFilter
  priority: PriorityFilter
  date:     DateFilter
}

export const DEFAULT_FILTERS: Filters = {
  query:    '',
  channel:  'all',
  priority: 'all',
  date:     'all',
}

// ─── Filter options ────────────────────────────────────────────────────────────

const CHANNEL_OPTIONS: { value: ChannelFilter; label: string }[] = [
  { value: 'all',      label: 'Tutti'     },
  { value: 'email',    label: 'Email'     },
  { value: 'whatsapp', label: 'WhatsApp'  },
]

const PRIORITY_OPTIONS: { value: PriorityFilter; label: string }[] = [
  { value: 'all',    label: 'Tutte' },
  { value: 'high',   label: 'Alta'  },
  { value: 'medium', label: 'Media' },
  { value: 'low',    label: 'Bassa' },
]

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'all',   label: 'Tutto'    },
  { value: 'today', label: 'Oggi'     },
  { value: '7d',    label: '7 giorni' },
  { value: '30d',   label: '30 giorni'},
]

// ─── PillGroup ─────────────────────────────────────────────────────────────────

function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 ring-1 ring-inset ring-gray-200">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150',
            value === opt.value
              ? 'bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200'
              : 'text-gray-500 hover:text-gray-900',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── SearchBar ─────────────────────────────────────────────────────────────────

interface Props {
  filters:        Filters
  onChange:       (patch: Partial<Filters>) => void
  onReset:        () => void
  isFiltered:     boolean
  categoryTitle?: string
}

export function SearchBar({ filters, onChange, onReset, isFiltered, categoryTitle }: Props) {
  return (
    <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-3">
      {/* Row 1: back link (if category) + text input + reset button */}
      <div className="flex items-center gap-3">
        {categoryTitle && (
          <Link
            href="/"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 transition-all hover:border-gray-400 hover:text-gray-900"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {categoryTitle}
          </Link>
        )}
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cerca per mittente, oggetto o testo…"
            value={filters.query}
            onChange={(e) => onChange({ query: e.target.value })}
            className={[
              'w-full rounded-lg border bg-gray-50 py-2 pl-9 pr-9',
              'text-sm text-gray-900 placeholder:text-gray-400',
              'border-gray-200 outline-none',
              'focus:border-gray-400 focus:ring-1 focus:ring-gray-200',
              'transition-all duration-150',
            ].join(' ')}
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChange({ query: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Cancella ricerca"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className={[
              'shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2',
              'text-xs font-medium text-gray-500 transition-all duration-150',
              'hover:border-gray-400 hover:text-gray-900',
            ].join(' ')}
          >
            Azzera filtri
          </button>
        )}
      </div>

      {/* Row 2: filter pills */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Canale
        </span>
        <PillGroup
          options={CHANNEL_OPTIONS}
          value={filters.channel}
          onChange={(v) => onChange({ channel: v })}
        />

        <div className="h-4 w-px bg-gray-200" />

        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Priorità
        </span>
        <PillGroup
          options={PRIORITY_OPTIONS}
          value={filters.priority}
          onChange={(v) => onChange({ priority: v })}
        />

        <div className="h-4 w-px bg-gray-200" />

        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Data
        </span>
        <PillGroup
          options={DATE_OPTIONS}
          value={filters.date}
          onChange={(v) => onChange({ date: v })}
        />
      </div>
    </div>
  )
}

'use client'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  receivedToday:      number
  avgResponseHours:   number | null   // null = not computable (no replied_at in schema)
  resolvedPct24h:     number
  highPriorityUnread: number
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

function IconInbox() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function IconCheckCircle() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}

// ─── StatCard ──────────────────────────────────────────────────────────────────

interface CardConfig {
  label:    string
  value:    string
  icon:     React.ReactNode
  iconBg:   string
  iconText: string
  accent:   string   // left border / glow colour class
}

function StatCard({ label, value, icon, iconBg, iconText, accent }: CardConfig) {
  return (
    <div
      className={[
        'relative flex flex-1 min-w-0 items-center gap-4 rounded-xl',
        'border border-white/[0.07] bg-zinc-800/50 px-5 py-4',
        'overflow-hidden',
      ].join(' ')}
    >
      {/* Subtle left accent bar */}
      <div className={['absolute left-0 top-0 h-full w-[3px]', accent].join(' ')} />

      {/* Icon bubble */}
      <div className={['shrink-0 rounded-lg p-2.5', iconBg, iconText].join(' ')}>
        {icon}
      </div>

      {/* Text */}
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums tracking-tight text-white">
          {value}
        </p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  )
}

// ─── StatsRow ──────────────────────────────────────────────────────────────────

interface Props {
  stats: DashboardStats
}

export function StatsRow({ stats }: Props) {
  const avgDisplay =
    stats.avgResponseHours === null
      ? '—'
      : `${stats.avgResponseHours.toFixed(1)}h`

  const cards: CardConfig[] = [
    {
      label:    'Messaggi ricevuti oggi',
      value:    String(stats.receivedToday),
      icon:     <IconInbox />,
      iconBg:   'bg-blue-500/15',
      iconText: 'text-blue-400',
      accent:   'bg-blue-500',
    },
    {
      label:    'Tempo medio di risposta',
      value:    avgDisplay,
      icon:     <IconClock />,
      iconBg:   'bg-violet-500/15',
      iconText: 'text-violet-400',
      accent:   'bg-violet-500',
    },
    {
      label:    'Risolti nelle ultime 24 ore',
      value:    `${stats.resolvedPct24h}%`,
      icon:     <IconCheckCircle />,
      iconBg:   'bg-emerald-500/15',
      iconText: 'text-emerald-400',
      accent:   'bg-emerald-500',
    },
    {
      label:    'Alta priorità non gestiti',
      value:    String(stats.highPriorityUnread),
      icon:     <IconAlert />,
      iconBg:   'bg-red-500/15',
      iconText: 'text-red-400',
      accent:   'bg-red-500',
    },
  ]

  return (
    <div className="shrink-0 border-b border-white/[0.06] bg-zinc-900 px-6 py-4">
      <div className="flex gap-3">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
    </div>
  )
}

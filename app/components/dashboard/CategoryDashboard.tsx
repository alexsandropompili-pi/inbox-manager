'use client'

import Link from 'next/link'

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
    arrivedToday: number
    urgent: number
  }
  userEmail: string
}

function StatButton({
  href,
  label,
  value,
  sub,
}: {
  href: string
  label: string
  value: number
  sub: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-gray-400 hover:shadow-sm transition-all duration-150"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{value}</p>
      <p className="mt-1.5 text-xs text-gray-400">{sub}</p>
    </Link>
  )
}

function CategoryCard({ notion }: { notion: string }) {
  return (
    <Link
      href={`/?category=${encodeURIComponent(notion)}`}
      className="aspect-square flex items-center justify-center rounded-xl border-2 border-gray-900 bg-white hover:bg-gray-50 hover:shadow-lg transition-all duration-150 active:scale-[0.98]"
    >
      <span className="text-lg font-bold text-gray-900 text-center px-4 leading-tight">{notion}</span>
    </Link>
  )
}

export function CategoryDashboard({ categories, stats }: Props) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white px-8 py-6">

      {/* ── Stat buttons ── */}
      <div className="grid grid-cols-3 gap-3 mb-6 shrink-0">
        <StatButton
          href="/tickets"
          label="Ticket totali"
          value={stats.total}
          sub={`${stats.replied} conclusi`}
        />
        <StatButton
          href="/tickets/today"
          label="Arrivati oggi"
          value={stats.arrivedToday}
          sub="Nuovi in giornata"
        />
        <StatButton
          href="/tickets/urgent"
          label="Ticket urgenti"
          value={stats.urgent}
          sub="Alta o critica urgenza"
        />
      </div>

      {/* ── Section label ── */}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3 shrink-0">
        Categorie
      </p>

      {/* ── Category grid ── */}
      <div className="flex-1 min-h-0">
        <div className="grid grid-cols-5 gap-4 h-full">
          {categories.map((cat) => (
            <CategoryCard key={cat.notion} notion={cat.notion} />
          ))}
        </div>
      </div>

    </div>
  )
}

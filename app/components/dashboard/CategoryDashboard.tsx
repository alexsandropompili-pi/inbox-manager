'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/types/database'

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

const BADGES_KEY = 'inbox_category_badges'

function mapToFixedCategory(msg: Pick<Message, 'token_code' | 'notion_1' | 'notion_2' | 'notion_3' | 'subject'>): string {
  const catCode = msg.token_code?.split('-')[1] ?? ''
  if (catCode === 'FAT') return 'Fatture'
  if (catCode === 'COM') return 'Ordini'
  const text = [msg.notion_1, msg.notion_2, msg.notion_3, msg.subject].join(' ').toLowerCase()
  if (text.includes('reclam') || text.includes('contestaz') || text.includes('lament')) return 'Reclami'
  if (text.includes('fattur') || text.includes('pagament') || text.includes('rimborso')) return 'Fatture'
  if (text.includes('dipendent') || text.includes('ferie') || text.includes('permess') || text.includes('stipend')) return 'Richieste dipendenti'
  if (text.includes('ordin') || text.includes('acquist') || text.includes('forni')) return 'Ordini'
  return 'Spedizioni'
}

function readBadges(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BADGES_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function writeBadges(badges: Record<string, number>) {
  localStorage.setItem(BADGES_KEY, JSON.stringify(badges))
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

function CategoryCard({
  notion,
  badge,
  onClear,
}: {
  notion: string
  badge: number
  onClear: () => void
}) {
  return (
    <Link
      href={`/?category=${encodeURIComponent(notion)}`}
      onClick={onClear}
      className="relative aspect-square flex items-center justify-center rounded-xl border-2 border-gray-900 bg-white hover:bg-gray-50 hover:shadow-lg transition-all duration-150 active:scale-[0.98]"
    >
      {badge > 0 && (
        <span className="absolute top-2.5 right-2.5 flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold leading-none shadow-sm animate-[badge-pop_0.2s_ease-out]">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <span className="text-lg font-bold text-gray-900 text-center px-4 leading-tight">{notion}</span>
    </Link>
  )
}

export function CategoryDashboard({ categories, stats }: Props) {
  const router = useRouter()
  const [badges, setBadges] = useState<Record<string, number>>({})

  // Load badges from localStorage on mount
  useEffect(() => {
    setBadges(readBadges())
  }, [])

  // Supabase Realtime: listen for new messages
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('category-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as Message
          // Only count root messages (not thread replies)
          if (msg.thread_id !== null) return

          const category = mapToFixedCategory(msg)

          setBadges((prev) => {
            const updated = { ...prev, [category]: (prev[category] ?? 0) + 1 }
            writeBadges(updated)
            return updated
          })

          router.refresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  const clearBadge = useCallback((category: string) => {
    setBadges((prev) => {
      const updated = { ...prev }
      delete updated[category]
      writeBadges(updated)
      return updated
    })
  }, [])

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
            <CategoryCard
              key={cat.notion}
              notion={cat.notion}
              badge={badges[cat.notion] ?? 0}
              onClear={() => clearBadge(cat.notion)}
            />
          ))}
        </div>
      </div>

    </div>
  )
}

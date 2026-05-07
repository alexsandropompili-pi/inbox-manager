import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { AppShell } from '@/app/components/layout/AppShell'
import type { Message } from '@/types/database'

const FIXED_CATEGORIES = ['Spedizioni', 'Reclami', 'Fatture', 'Richieste dipendenti', 'Ordini']

function mapToFixedCategory(notion1: string | null | undefined): string {
  const n = (notion1 ?? '').toLowerCase()
  if (n.includes('reclam') || n.includes('contestaz') || n.includes('lament')) return 'Reclami'
  if (n.includes('fattur') || n.includes('pagament') || n.includes('rimborso')) return 'Fatture'
  if (n.includes('dipendent') || n.includes('ferie') || n.includes('permess') || n.includes('stipend')) return 'Richieste dipendenti'
  if (n.includes('ordin') || n.includes('acquist') || n.includes('forni')) return 'Ordini'
  return 'Spedizioni'
}

export default async function ArchivioPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const q         = typeof params.q          === 'string' ? params.q.trim()         : ''
  const categoria = typeof params.categoria  === 'string' ? params.categoria        : ''
  const mittente  = typeof params.mittente   === 'string' ? params.mittente.trim()  : ''
  const fromDate  = typeof params.from_date  === 'string' ? params.from_date        : ''
  const toDate    = typeof params.to_date    === 'string' ? params.to_date          : ''

  const hasSearch = !!(q || categoria || mittente || fromDate || toDate)

  let messages: Message[] = []

  if (hasSearch) {
    const db = createServiceClient()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    let query = db
      .from('messages')
      .select('*')
      .eq('status', 'replied')
      .gte('received_at', (fromDate ? new Date(fromDate) : thirtyDaysAgo).toISOString())
      .order('received_at', { ascending: false })

    if (toDate) {
      const to = new Date(toDate)
      to.setHours(23, 59, 59, 999)
      query = query.lte('received_at', to.toISOString())
    }

    if (q) {
      query = query.or(`subject.ilike.%${q}%,body.ilike.%${q}%`)
    }

    if (mittente) {
      query = query.or(`from_email.ilike.%${mittente}%,from_name.ilike.%${mittente}%`)
    }

    const { data } = await query
    let results = (data ?? []) as Message[]

    if (categoria) {
      results = results.filter((m) => mapToFixedCategory(m.notion_1) === categoria)
    }

    messages = results
  }

  return (
    <AppShell userEmail={user.email ?? ''}>
      <div className="flex flex-1 flex-col overflow-hidden bg-white">

        {/* Header */}
        <div className="shrink-0 border-b border-gray-200 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900">Archivio</h1>
          <p className="mt-0.5 text-sm text-gray-500">Cerca tra i ticket conclusi degli ultimi 30 giorni</p>
        </div>

        {/* Search form */}
        <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-8 py-5">
          <form method="GET" action="/archivio" className="flex flex-wrap items-end gap-3">

            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Cerca</label>
              <input
                name="q"
                defaultValue={q}
                placeholder="Parola chiave (oggetto o corpo)"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Categoria</label>
              <select
                name="categoria"
                defaultValue={categoria}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">Tutte</option>
                {FIXED_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Mittente</label>
              <input
                name="mittente"
                defaultValue={mittente}
                placeholder="Nome o email"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Dal</label>
              <input
                type="date"
                name="from_date"
                defaultValue={fromDate}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Al</label>
              <input
                type="date"
                name="to_date"
                defaultValue={toDate}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-6 py-2 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
            >
              Cerca
            </button>

            {hasSearch && (
              <a
                href="/archivio"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancella
              </a>
            )}
          </form>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {!hasSearch ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <p className="text-sm font-medium text-gray-400">Usa i filtri per cercare tra i ticket conclusi</p>
              <p className="mt-1 text-xs text-gray-300">Puoi cercare per parola chiave, categoria, mittente o data</p>
            </div>
          ) : (
            <>
              <div className="shrink-0 grid grid-cols-[1fr_160px_140px] border-b border-gray-200 bg-gray-50 px-8 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Nome</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Categoria</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Data</span>
              </div>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="grid grid-cols-[1fr_160px_140px] border-b border-gray-100 px-8 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 pr-8">
                    <p className="text-sm font-medium text-gray-900 truncate">{msg.subject}</p>
                    <p className="mt-0.5 text-xs text-gray-400 truncate">
                      {msg.from_name ? `${msg.from_name} — ${msg.from_email}` : msg.from_email}
                    </p>
                  </div>
                  <span className="text-sm text-gray-700 self-center">
                    {mapToFixedCategory(msg.notion_1)}
                  </span>
                  <span className="text-sm text-gray-500 self-center">
                    {new Intl.DateTimeFormat('it-IT', { dateStyle: 'short' }).format(new Date(msg.received_at))}
                  </span>
                </div>
              ))}

              {messages.length === 0 && (
                <div className="px-8 py-20 text-center text-sm text-gray-400">
                  Nessun ticket trovato con i filtri selezionati.
                </div>
              )}

              {messages.length > 0 && (
                <p className="px-8 py-4 text-xs text-gray-300">
                  {messages.length} risultat{messages.length === 1 ? 'o' : 'i'} trovati
                </p>
              )}
            </>
          )}
        </div>

      </div>
    </AppShell>
  )
}

'use client'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  total: number
  byStatus: { arrived: number; in_progress: number; replied: number }
  trendData: { date: string; count: number }[]
  settoreData: { name: string; count: number }[]
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="relative flex flex-1 min-w-0 items-center gap-4 rounded-xl border border-white/[0.07] bg-zinc-800/50 px-5 py-5 overflow-hidden">
      <div className={`absolute left-0 top-0 h-full w-[3px] ${accent}`} />
      <div className="min-w-0">
        <p className="text-3xl font-bold tabular-nums tracking-tight text-white">{value}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  )
}

// ─── Chart wrapper ────────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-zinc-800/50 p-5">
      <p className="mb-4 text-sm font-semibold text-zinc-300">{title}</p>
      {children}
    </div>
  )
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-400">{label}</p>
      <p className="font-bold text-white">{payload[0].value} messaggi</p>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function StatsClient({ total, byStatus, trendData, settoreData }: Props) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-zinc-950 px-6 py-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white">Report</h1>
          <p className="mt-1 text-sm text-zinc-500">Panoramica sull&apos;attività del sistema</p>
        </div>

        {/* Stat cards */}
        <div className="flex gap-4">
          <StatCard label="Totale messaggi" value={total} accent="bg-blue-500" />
          <StatCard label="In arrivo" value={byStatus.arrived} accent="bg-amber-500" />
          <StatCard label="In lavorazione" value={byStatus.in_progress} accent="bg-violet-500" />
          <StatCard label="Risposti" value={byStatus.replied} accent="bg-emerald-500" />
        </div>

        {/* Trend chart */}
        <ChartCard title="Messaggi ricevuti — ultimi 30 giorni">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#71717a', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#71717a', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Settore chart */}
        <ChartCard title="Messaggi per settore">
          {settoreData.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-600">Nessun dato ancora disponibile</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={settoreData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

      </div>
    </div>
  )
}

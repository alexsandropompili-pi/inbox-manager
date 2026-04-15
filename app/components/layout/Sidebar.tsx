'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/app/actions/auth'

// ─── Icon primitives ──────────────────────────────────────────────────────────

function Icon({ path, className = 'h-5 w-5' }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

const PATHS = {
  chevronLeft:  'M15.75 19.5L8.25 12l7.5-7.5',
  chevronRight: 'M8.25 4.5l7.5 7.5-7.5 7.5',
  grid:         'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
  inbox:        'M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z',
  chart:        'M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z',
  cog:          'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  user:         'M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z',
  logout:       'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
      {label}
    </p>
  )
}

function NavItem({
  href,
  iconPath,
  label,
  isActive,
  badge,
}: {
  href: string
  iconPath: string
  label: string
  isActive: boolean
  badge?: string
}) {
  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150',
        isActive
          ? 'bg-blue-500/15 text-blue-200 shadow-sm'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100',
      ].join(' ')}
    >
      <Icon path={iconPath} className="h-[18px] w-[18px] shrink-0" />
      <span className="overflow-hidden whitespace-nowrap font-medium">{label}</span>
      {badge && (
        <span className="ml-auto rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 ring-1 ring-inset ring-white/10">
          {badge}
        </span>
      )}
    </Link>
  )
}

function ChannelItem({
  color,
  initial,
  label,
  connected,
}: {
  color: string
  initial: string
  label: string
  connected: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-400">
      <div className={`relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md text-[9px] font-bold text-white ${color}`}>
        {initial}
        <span
          className={[
            'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-zinc-900',
            connected ? 'bg-emerald-400' : 'bg-zinc-700',
          ].join(' ')}
        />
      </div>
      <span className="overflow-hidden whitespace-nowrap font-medium">{label}</span>
      <span
        className={[
          'ml-auto shrink-0 text-[10px] font-medium',
          connected ? 'text-emerald-400' : 'text-zinc-700',
        ].join(' ')}
      >
        {connected ? 'Attivo' : 'Off'}
      </span>
    </div>
  )
}

function TeamMember({
  initials,
  color,
  name,
  online,
}: {
  initials: string
  color: string
  name: string
  online: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2">
      <div className={`relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${color}`}>
        {initials}
        <span
          className={[
            'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-zinc-900',
            online ? 'bg-emerald-400' : 'bg-zinc-700',
          ].join(' ')}
        />
      </div>
      <span className="overflow-hidden whitespace-nowrap text-sm font-medium text-zinc-400">
        {name}
      </span>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onToggle: () => void
  userEmail: string
}

const CHANNELS = [
  { initial: 'G', color: 'bg-red-500',     label: 'Gmail',    connected: false },
  { initial: 'O', color: 'bg-blue-600',    label: 'Outlook',  connected: false },
  { initial: 'W', color: 'bg-emerald-500', label: 'WhatsApp', connected: false },
]

const TEAM = [
  { initials: 'MR', color: 'bg-violet-500', name: 'Marco R.',  online: true  },
  { initials: 'SB', color: 'bg-pink-500',   name: 'Sofia B.',  online: true  },
  { initials: 'LM', color: 'bg-amber-500',  name: 'Luca M.',   online: false },
]

export function Sidebar({ isOpen, onToggle, userEmail }: Props) {
  const pathname = usePathname()
  const userInitial = userEmail.charAt(0).toUpperCase()

  return (
    <>
      {/* ── Sidebar panel ── */}
      <aside
        className={[
          'relative h-full flex-shrink-0 overflow-hidden bg-zinc-900',
          'transition-[width] duration-300 ease-in-out',
          isOpen ? 'w-64 border-r border-white/[0.04]' : 'w-0 border-r-0',
        ].join(' ')}
      >
        {/* Content: always w-64, clipped by aside's overflow-hidden when closing */}
        <div className="absolute inset-y-0 left-0 flex w-64 flex-col">
          {/* Header: logo + toggle */}
          <div className="flex h-[65px] shrink-0 items-center justify-between border-b border-white/[0.05] px-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white shadow-md shadow-blue-900/40">
                IM
              </div>
              <span className="whitespace-nowrap text-sm font-bold tracking-tight text-white">InboxManager</span>
            </div>
            <button
              onClick={onToggle}
              title="Chiudi sidebar"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-white/8 hover:text-zinc-300"
            >
              <Icon path={PATHS.chevronLeft} className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable nav area */}
          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2 py-2">
            <SectionLabel label="Navigazione" />
            <NavItem href="/"         iconPath={PATHS.grid}  label="Dashboard"        isActive={pathname === '/'} />
            <NavItem href="/messages" iconPath={PATHS.inbox} label="Tutti i messaggi" isActive={pathname === '/messages'} />
            <NavItem href="/stats"    iconPath={PATHS.chart} label="Statistiche"      isActive={pathname === '/stats'} badge="Presto" />

            <SectionLabel label="Canali" />
            {CHANNELS.map((ch) => (
              <ChannelItem key={ch.label} {...ch} />
            ))}

            <SectionLabel label="Team" />
            {TEAM.map((m) => (
              <TeamMember key={m.name} {...m} />
            ))}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-white/[0.05] px-2 py-3">
            <NavItem href="/settings" iconPath={PATHS.cog} label="Impostazioni" isActive={pathname === '/settings'} />

            <div title={userEmail} className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5">
              <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-[9px] font-bold text-white">
                {userInitial}
              </div>
              <span className="overflow-hidden whitespace-nowrap text-xs text-zinc-500">
                {userEmail}
              </span>
            </div>

            <form action={logoutAction} className="mt-0.5">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-500 transition-colors hover:bg-white/5 hover:text-red-400"
              >
                <Icon path={PATHS.logout} className="h-[18px] w-[18px] shrink-0" />
                <span className="overflow-hidden whitespace-nowrap font-medium">Esci</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── Floating tab button — visible only when sidebar is closed ── */}
      <div
        className={[
          'fixed left-0 top-1/2 z-50 -translate-y-1/2',
          'transition-all duration-300 ease-in-out',
          isOpen
            ? 'pointer-events-none opacity-0 -translate-x-2'
            : 'pointer-events-auto opacity-100 translate-x-0',
        ].join(' ')}
      >
        <button
          onClick={onToggle}
          title="Apri sidebar"
          className={[
            'flex h-12 w-5 items-center justify-center',
            'rounded-r-xl bg-zinc-800',
            'border border-l-0 border-white/[0.1]',
            'text-zinc-500 shadow-xl shadow-black/50',
            'transition-all duration-200 ease-out',
            'hover:w-7 hover:bg-zinc-700 hover:text-zinc-100',
          ].join(' ')}
        >
          <Icon path={PATHS.chevronRight} className="h-3.5 w-3.5 shrink-0" />
        </button>
      </div>
    </>
  )
}

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

function SectionLabel({ label, isOpen }: { label: string; isOpen: boolean }) {
  return (
    <div
      className={[
        'overflow-hidden whitespace-nowrap transition-[max-height,opacity] duration-200',
        isOpen ? 'max-h-8 opacity-100' : 'max-h-0 opacity-0',
      ].join(' ')}
    >
      <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        {label}
      </p>
    </div>
  )
}

function NavItem({
  href,
  iconPath,
  label,
  isOpen,
  isActive,
  badge,
}: {
  href: string
  iconPath: string
  label: string
  isOpen: boolean
  isActive: boolean
  badge?: string
}) {
  return (
    <Link
      href={href}
      title={!isOpen ? label : undefined}
      className={[
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150',
        isActive
          ? 'bg-white/10 text-white'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100',
      ].join(' ')}
    >
      <Icon path={iconPath} className="h-[18px] w-[18px] shrink-0" />
      <span
        className={[
          'overflow-hidden whitespace-nowrap font-medium transition-[max-width,opacity] duration-300',
          isOpen ? 'max-w-[180px] opacity-100' : 'max-w-0 opacity-0',
        ].join(' ')}
      >
        {label}
      </span>
      {badge && isOpen && (
        <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
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
  isOpen,
}: {
  color: string
  initial: string
  label: string
  connected: boolean
  isOpen: boolean
}) {
  return (
    <div
      title={!isOpen ? `${label} — ${connected ? 'Connesso' : 'Non connesso'}` : undefined}
      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-400"
    >
      {/* Channel avatar */}
      <div className={`relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md text-[9px] font-bold text-white ${color}`}>
        {initial}
        <span
          className={[
            'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-zinc-900',
            connected ? 'bg-emerald-400' : 'bg-zinc-600',
          ].join(' ')}
        />
      </div>
      <span
        className={[
          'overflow-hidden whitespace-nowrap font-medium transition-[max-width,opacity] duration-300',
          isOpen ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0',
        ].join(' ')}
      >
        {label}
      </span>
      {isOpen && (
        <span
          className={[
            'ml-auto shrink-0 text-[10px] font-medium',
            connected ? 'text-emerald-500' : 'text-zinc-600',
          ].join(' ')}
        >
          {connected ? 'Attivo' : 'Off'}
        </span>
      )}
    </div>
  )
}

function TeamMember({
  initials,
  color,
  name,
  online,
  isOpen,
}: {
  initials: string
  color: string
  name: string
  online: boolean
  isOpen: boolean
}) {
  return (
    <div
      title={!isOpen ? name : undefined}
      className="flex items-center gap-3 rounded-xl px-3 py-2"
    >
      <div className={`relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${color}`}>
        {initials}
        <span
          className={[
            'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-zinc-900',
            online ? 'bg-emerald-400' : 'bg-zinc-600',
          ].join(' ')}
        />
      </div>
      <span
        className={[
          'overflow-hidden whitespace-nowrap text-sm font-medium text-zinc-400 transition-[max-width,opacity] duration-300',
          isOpen ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0',
        ].join(' ')}
      >
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
  { initial: 'G', color: 'bg-red-500',   label: 'Gmail',    connected: false },
  { initial: 'O', color: 'bg-blue-600',  label: 'Outlook',  connected: false },
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
    <aside
      className={[
        'relative flex flex-col bg-zinc-900',
        'overflow-hidden transition-[width] duration-300 ease-in-out',
        isOpen ? 'w-64' : 'w-[70px]',
      ].join(' ')}
    >
      {/* ── Header: logo + toggle ── */}
      <div className="flex h-[65px] shrink-0 items-center justify-between border-b border-white/5 px-3">
        {/* Logo */}
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
            IM
          </div>
          <span
            className={[
              'overflow-hidden whitespace-nowrap text-sm font-bold text-white transition-[max-width,opacity] duration-300',
              isOpen ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0',
            ].join(' ')}
          >
            InboxManager
          </span>
        </div>

        {/* Toggle button */}
        <button
          onClick={onToggle}
          title={isOpen ? 'Chiudi sidebar' : 'Apri sidebar'}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200"
        >
          <Icon
            path={isOpen ? PATHS.chevronLeft : PATHS.chevronRight}
            className="h-4 w-4"
          />
        </button>
      </div>

      {/* ── Scrollable nav area ── */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2 py-2 scrollbar-thin">

        {/* Navigazione */}
        <SectionLabel label="Navigazione" isOpen={isOpen} />
        <NavItem href="/"         iconPath={PATHS.grid}  label="Dashboard"        isOpen={isOpen} isActive={pathname === '/'} />
        <NavItem href="/messages" iconPath={PATHS.inbox} label="Tutti i messaggi" isOpen={isOpen} isActive={pathname === '/messages'} />
        <NavItem href="/stats"    iconPath={PATHS.chart} label="Statistiche"      isOpen={isOpen} isActive={pathname === '/stats'} badge="Presto" />

        {/* Canali */}
        <SectionLabel label="Canali" isOpen={isOpen} />
        {CHANNELS.map((ch) => (
          <ChannelItem key={ch.label} {...ch} isOpen={isOpen} />
        ))}

        {/* Team */}
        <SectionLabel label="Team" isOpen={isOpen} />
        {TEAM.map((m) => (
          <TeamMember key={m.name} {...m} isOpen={isOpen} />
        ))}
      </div>

      {/* ── Footer: settings + profile + logout ── */}
      <div className="shrink-0 border-t border-white/5 px-2 py-3">
        {/* Impostazioni */}
        <NavItem href="/settings" iconPath={PATHS.cog} label="Impostazioni" isOpen={isOpen} isActive={pathname === '/settings'} />

        {/* Profile row */}
        <div
          title={!isOpen ? userEmail : undefined}
          className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5"
        >
          <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
            {userInitial}
          </div>
          <span
            className={[
              'overflow-hidden whitespace-nowrap text-xs text-zinc-400 transition-[max-width,opacity] duration-300',
              isOpen ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0',
            ].join(' ')}
          >
            {userEmail}
          </span>
        </div>

        {/* Logout */}
        <form action={logoutAction} className="mt-0.5">
          <button
            type="submit"
            title={!isOpen ? 'Esci' : undefined}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-red-400"
          >
            <Icon path={PATHS.logout} className="h-[18px] w-[18px] shrink-0" />
            <span
              className={[
                'overflow-hidden whitespace-nowrap font-medium transition-[max-width,opacity] duration-300',
                isOpen ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0',
              ].join(' ')}
            >
              Esci
            </span>
          </button>
        </form>
      </div>
    </aside>
  )
}

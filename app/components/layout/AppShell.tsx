'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from './Sidebar'

const SESSION_KEY = 'gpc_active_session'

interface Props {
  userEmail: string
  children: React.ReactNode
}

export function AppShell({ userEmail, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Se il flag non c'è significa che il tab è stato chiuso e riaperto → forza login
    if (!sessionStorage.getItem(SESSION_KEY)) {
      const supabase = createClient()
      supabase.auth.signOut().then(() => router.replace('/login'))
      return
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Imposta il flag per questa sessione di navigazione
    sessionStorage.setItem(SESSION_KEY, '1')
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Suspense required because Sidebar uses useSearchParams */}
      <Suspense fallback={<div className="w-64 shrink-0 bg-white border-r border-gray-200" />}>
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          userEmail={userEmail}
        />
      </Suspense>

      {/* Main content — fills remaining width; KanbanBoard handles its own scroll */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}

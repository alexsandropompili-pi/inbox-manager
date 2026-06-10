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
  // null = non ancora verificato, false = sessione non valida, true = ok
  const [sessionReady, setSessionReady] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      // Tab riaperto senza sessione attiva → logout e redirect
      const supabase = createClient()
      supabase.auth.signOut().then(() => router.replace('/login'))
      return
    }
    setSessionReady(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Imposta il flag solo dopo che la sessione è confermata valida
    if (sessionReady) sessionStorage.setItem(SESSION_KEY, '1')
  }, [sessionReady])

  // Blocca rendering finché il check sessionStorage non è completato
  if (!sessionReady) return null

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

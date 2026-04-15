'use client'

import { Suspense, useState } from 'react'
import { Sidebar } from './Sidebar'

interface Props {
  userEmail: string
  children: React.ReactNode
}

export function AppShell({ userEmail, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Suspense required because Sidebar uses useSearchParams */}
      <Suspense fallback={<div className="w-64 shrink-0 bg-zinc-900" />}>
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

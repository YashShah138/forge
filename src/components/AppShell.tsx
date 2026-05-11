'use client'

import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

interface AppShellProps {
  user: { name: string; email: string; avatarInitials: string }
  streak: number
  children: React.ReactNode
}

export default function AppShell({ user, streak, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('forge-sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  function handleToggle() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('forge-sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar collapsed={collapsed} streak={streak} user={user} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar collapsed={collapsed} onToggle={handleToggle} streak={streak} user={user} />
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  )
}

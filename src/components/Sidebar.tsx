'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Workouts', href: '/workouts' },
  { label: 'Food', href: '/food' },
  { label: 'Meals', href: '/meals' },
]

interface SidebarProps {
  collapsed: boolean
  streak: number
  user: { name: string; email: string; avatarInitials: string }
}

export default function Sidebar({ collapsed, streak, user }: SidebarProps) {
  const pathname = usePathname()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('forge-theme')
    if (stored === 'light') setTheme('light')
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('forge-theme', next)
    if (next === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }

  return (
    <div
      className="flex flex-col flex-shrink-0 border-r transition-all duration-200"
      style={{
        width: collapsed ? '56px' : '200px',
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center px-4 flex-shrink-0 border-b"
        style={{ height: '40px', borderColor: 'var(--border)' }}
      >
        <span
          className="font-medium tracking-widest uppercase overflow-hidden whitespace-nowrap"
          style={{ color: 'var(--text-primary)', fontSize: collapsed ? '14px' : '16px' }}
        >
          {collapsed ? 'F' : 'FORGE'}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        {NAV_ITEMS.map(({ label, href }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors text-sm relative overflow-hidden"
              style={{
                background: active ? 'var(--active-nav-bg)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                borderRight: active ? '2px solid var(--accent)' : '2px solid transparent',
              }}
              title={collapsed ? label : undefined}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: active ? 'var(--accent)' : 'var(--text-muted)' }}
              />
              {!collapsed && (
                <span className="truncate text-xs tracking-wide">{label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: streak + theme toggle + user */}
      {!collapsed && (
        <div
          className="flex flex-col gap-3 p-3 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          {streak > 0 && (
            <span className="text-xs px-2" style={{ color: 'var(--text-muted)' }}>
              🔥 {streak} day streak
            </span>
          )}

          {/* Theme toggle */}
          <div className="flex items-center gap-2 px-2">
            <button
              onClick={toggleTheme}
              className="relative flex-shrink-0 rounded-full transition-colors"
              style={{
                width: '36px',
                height: '20px',
                background: theme === 'dark' ? 'var(--accent)' : 'var(--track)',
              }}
              aria-label="Toggle theme"
            >
              <span
                className="absolute top-[3px] rounded-full transition-transform duration-200"
                style={{
                  width: '14px',
                  height: '14px',
                  background: '#fff',
                  left: theme === 'dark' ? '19px' : '3px',
                }}
              />
            </button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {theme === 'dark' ? '☾' : '☀'}
            </span>
          </div>

          {/* User */}
          <div className="flex items-center gap-2 px-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
              style={{ background: 'var(--accent)', color: '#09090b' }}
            >
              {user.avatarInitials}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                {user.name || user.email}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Level 1
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed: just avatar dot */}
      {collapsed && (
        <div className="flex justify-center p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
            style={{ background: 'var(--accent)', color: '#09090b' }}
          >
            {user.avatarInitials}
          </div>
        </div>
      )}
    </div>
  )
}

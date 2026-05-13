'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

  return (
    <div
      className="flex flex-col flex-shrink-0 border-r transition-all duration-200"
      style={{
        width: collapsed ? '64px' : '256px',
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center px-4 flex-shrink-0 border-b"
        style={{ height: '64px', borderColor: 'var(--border)' }}
      >
        <span
          className="font-medium tracking-widest uppercase overflow-hidden whitespace-nowrap"
          style={{ color: 'var(--text-primary)', fontSize: collapsed ? '15px' : '20px' }}
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
                <span className="truncate text-base tracking-wide">{label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: streak + user */}
      {!collapsed && (
        <div
          className="flex flex-col gap-3 p-3 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          {streak > 0 && (
            <span className="text-base px-2" style={{ color: 'var(--text-muted)' }}>
              🔥 {streak} day streak
            </span>
          )}

          {/* User */}
          <div className="flex items-center gap-2.5 px-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ background: 'var(--accent)', color: '#09090b' }}
            >
              {user.avatarInitials}
            </div>
            <div className="overflow-hidden">
              <div className="text-base truncate" style={{ color: 'var(--text-primary)' }}>
                {user.name || user.email}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
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
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: 'var(--accent)', color: '#09090b' }}
          >
            {user.avatarInitials}
          </div>
        </div>
      )}
    </div>
  )
}

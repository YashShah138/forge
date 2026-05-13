'use client'

import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/workouts': 'Workouts',
  '/food': 'Food',
  '/meals': 'Meals',
}

interface TopbarProps {
  collapsed: boolean
  onToggle: () => void
  streak: number
  user: { avatarInitials: string }
}

export default function Topbar({ collapsed, onToggle, streak, user }: TopbarProps) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? ''

  return (
    <div
      className="flex items-center gap-3 px-4 border-b flex-shrink-0"
      style={{
        height: '64px',
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <button
        onClick={onToggle}
        className="flex flex-col gap-[4px] p-2 rounded-md transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span className="block w-[18px] h-[2px] rounded-full" style={{ background: 'currentColor' }} />
        <span className="block w-[18px] h-[2px] rounded-full" style={{ background: 'currentColor' }} />
        <span className="block w-[18px] h-[2px] rounded-full" style={{ background: 'currentColor' }} />
      </button>

      <span
        className="flex-1 text-sm tracking-widest uppercase"
        style={{ color: 'var(--text-secondary)' }}
      >
        {title}
      </span>

      <div className="flex items-center gap-3">
        {streak > 0 && (
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            🔥 {streak}
          </span>
        )}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{ background: 'var(--accent)', color: '#09090b' }}
        >
          {user.avatarInitials}
        </div>
      </div>
    </div>
  )
}

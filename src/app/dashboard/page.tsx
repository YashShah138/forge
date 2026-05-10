import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/auth/actions'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black tracking-widest">FORGE</h1>
        <p className="text-zinc-400">Welcome, {user.email}</p>
        <form action={logout}>
            <button className="text-sm text-red-400 border border-red-900 px-4 py-2 rounded-lg hover:bg-red-950 transition-colors">
                Log Out
            </button>
        </form>
      </div>
    </main>
  )
}
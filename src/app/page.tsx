import { createClient } from '@/lib/supabase/server'

export default async function Home() {
	const supabase = await createClient()
	const { data: { user } } = await supabase.auth.getUser()

	return <div>{user ? `Logged in: ${user.email}` : 'Not logged in'}</div>
}
import { login, signup } from '../auth/actions'
// move actions.ts here instead if you prefer co-location

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string }>
}) {
	const { error } = await searchParams

	return (
		<main className="min-h-screen bg-black flex items-center justify-center">
			<div className="w-full max-w-sm space-y-6 px-6">

				{/* Logo */}
				<div className="text-center">
					<h1 className="text-6xl font-black tracking-widest text-white uppercase">
						FORGE
					</h1>
					<p className="text-zinc-500 text-sm mt-2">
						Build the body. Track the work.
					</p>
				</div>

				{/* Error */}
				{error && (
					<p className="text-red-400 text-sm text-center bg-red-950 border border-red-800 rounded-lg px-4 py-2">
						{error}
					</p>
				)}

				{/* Form */}
				<form className="space-y-4">
					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest">
							Email
						</label>
						<input
							name="email"
							type="email"
							required
							className="mt-1 w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-lime-400"
						/>
					</div>

					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest">
							Password
						</label>
						<input
							name="password"
							type="password"
							required
							className="mt-1 w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-lime-400"
						/>
					</div>

					<div className="flex gap-3 pt-2">
						<button
						formAction={login}
						className="flex-1 bg-lime-400 text-black font-semibold rounded-lg py-3 text-sm hover:bg-lime-300 transition-colors"
						>
						Log In
						</button>
						<button
						formAction={signup}
						className="flex-1 bg-zinc-900 border border-zinc-700 text-white font-semibold rounded-lg py-3 text-sm hover:border-zinc-500 transition-colors"
						>
						Sign Up
						</button>
					</div>
				</form>
			</div>
		</main>
	)
}
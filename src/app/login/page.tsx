import { login, signup } from '../auth/actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm space-y-6 px-6">

        {/* Logo */}
        <div className="text-center">
          <h1
            className="text-5xl font-medium tracking-widest uppercase"
            style={{ color: 'var(--text-primary)' }}
          >
            FORGE
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Build the body. Track the work.
          </p>
        </div>

        {/* Error */}
        {error && (
          <p
            className="text-sm text-center rounded-lg px-4 py-2 border"
            style={{
              color: 'var(--accent)',
              background: 'var(--active-nav-bg)',
              borderColor: 'var(--accent)',
            }}
          >
            {error}
          </p>
        )}

        {/* Form */}
        <form className="space-y-4">
          <div>
            <label
              className="text-xs uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)' }}
            >
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg px-4 py-3 text-sm focus:outline-none border"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label
              className="text-xs uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)' }}
            >
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-lg px-4 py-3 text-sm focus:outline-none border"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              formAction={login}
              className="flex-1 font-semibold rounded-lg py-3 text-sm transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#09090b' }}
            >
              Log In
            </button>
            <button
              formAction={signup}
              className="flex-1 font-semibold rounded-lg py-3 text-sm border transition-colors"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

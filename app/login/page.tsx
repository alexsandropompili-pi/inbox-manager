import { LoginForm } from './LoginForm'

export const metadata = {
  title: 'Accedi — InboxManager',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900">InboxManager</h1>
          <p className="mt-1 text-sm text-zinc-500">Accedi al tuo account aziendale</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}

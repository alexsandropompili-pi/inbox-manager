import { LoginForm } from './LoginForm'

export const metadata = {
  title: 'Accedi — InboxManager',
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#09090b] px-4 py-12">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-60 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-blue-600/8 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-[400px] w-[500px] rounded-full bg-blue-900/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[300px] w-[300px] rounded-full bg-indigo-900/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 ring-1 ring-blue-500/30">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">InboxManager</h1>
          <p className="mt-1 text-sm text-zinc-500">Accedi al tuo account aziendale</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/80 p-8 shadow-2xl backdrop-blur-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}

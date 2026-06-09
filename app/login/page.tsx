import { LoginForm } from './LoginForm'

export const metadata = {
  title: 'Accedi — GP Courier',
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #2d3348 30%, #1e2235 60%, #141824 100%)' }}
    >
      {/* Ambient gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, #6b7280 0%, transparent 70%)' }}
        />
        <div className="absolute bottom-0 left-0 h-[400px] w-[500px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, #9ca3af 0%, transparent 70%)' }}
        />
        <div className="absolute right-0 top-1/2 h-[350px] w-[350px] -translate-y-1/2 rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, #6b7280 0%, transparent 70%)' }}
        />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl"
              style={{ background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' }}
            >
              <svg className="h-7 w-7 text-gray-200" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">GP Courier</h1>
          <p className="mt-1.5 text-sm text-slate-400">Gestione comunicazioni aziendali</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border p-8 shadow-2xl backdrop-blur-sm"
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <LoginForm />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} GP Courier · Tutti i diritti riservati
        </p>

      </div>
    </div>
  )
}

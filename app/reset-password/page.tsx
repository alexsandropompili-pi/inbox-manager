import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResetPasswordForm } from './ResetPasswordForm'

export const metadata = {
  title: 'Nuova password — GP Courier',
}

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // The user must have a valid session (established via OTP verification).
  if (!user) redirect('/login')

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #2d3348 30%, #1e2235 60%, #141824 100%)' }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, #6b7280 0%, transparent 70%)' }}
        />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' }}
            >
              <svg className="h-7 w-7 text-gray-200" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">GP Courier</h1>
          <p className="mt-1.5 text-sm text-slate-400">Scegli una nuova password per il tuo account</p>
        </div>

        <div className="rounded-2xl border p-8 shadow-2xl backdrop-blur-sm"
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResetPasswordForm } from './ResetPasswordForm'

export const metadata = {
  title: 'Nuova password — InboxManager',
}

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // The user must have a valid session (established via OTP verification).
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">InboxManager</h1>
          <p className="mt-1 text-sm text-zinc-500">Scegli una nuova password per il tuo account</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-8 shadow-xl">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  )
}

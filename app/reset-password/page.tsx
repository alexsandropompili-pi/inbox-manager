import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResetPasswordForm } from './ResetPasswordForm'

export const metadata = {
  title: 'Nuova password — InboxManager',
}

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // The user must have a valid recovery session (established via /auth/callback).
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900">InboxManager</h1>
          <p className="mt-1 text-sm text-zinc-500">Scegli una nuova password per il tuo account</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  )
}

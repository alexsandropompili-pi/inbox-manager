'use client'

import { useActionState } from 'react'
import { updatePasswordAction } from '@/app/actions/auth'

const INPUT = [
  'w-full rounded-lg border border-white/10 bg-zinc-800 px-3.5 py-2.5',
  'text-sm text-zinc-100 placeholder:text-zinc-500',
  'focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40',
  'transition-colors',
].join(' ')

const LABEL = 'text-sm font-medium text-zinc-400'

export function ResetPasswordForm() {
  const [state, action, isPending] = useActionState<{ error: string } | null, FormData>(
    updatePasswordAction,
    null,
  )

  return (
    <form action={action} className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-white">Nuova password</h2>

      {state?.error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={LABEL}>
          Nuova password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Almeno 8 caratteri"
          className={INPUT}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className={LABEL}>
          Conferma password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Ripeti la nuova password"
          className={INPUT}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={[
          'mt-1 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors',
          isPending ? 'bg-blue-600/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500',
        ].join(' ')}
      >
        {isPending ? 'Salvataggio…' : 'Imposta nuova password'}
      </button>
    </form>
  )
}

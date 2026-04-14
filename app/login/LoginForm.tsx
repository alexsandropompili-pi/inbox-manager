'use client'

import { useActionState } from 'react'
import { loginAction } from '@/app/actions/auth'

type State = { error: string } | null

export function LoginForm() {
  const [state, action, isPending] = useActionState<State, FormData>(loginAction, null)

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="nome@azienda.it"
          className={[
            'rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900',
            'placeholder:text-zinc-400',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          ].join(' ')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={[
            'rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900',
            'placeholder:text-zinc-400',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          ].join(' ')}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={[
          'mt-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors',
          isPending
            ? 'bg-blue-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700',
        ].join(' ')}
      >
        {isPending ? 'Accesso in corso…' : 'Accedi'}
      </button>
    </form>
  )
}

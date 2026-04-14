'use client'

import { useState, useActionState } from 'react'
import { loginAction, resetPasswordAction } from '@/app/actions/auth'

type LoginState = { error: string } | null
type ResetState  = { error: string } | { success: true } | null

const INPUT_CLASS = [
  'rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900',
  'placeholder:text-zinc-400',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
].join(' ')

export function LoginForm() {
  const [mode, setMode] = useState<'login' | 'reset'>('login')

  const [loginState,  loginFormAction,  isLoginPending]  =
    useActionState<LoginState, FormData>(loginAction, null)

  const [resetState, resetFormAction, isResetPending] =
    useActionState<ResetState, FormData>(resetPasswordAction, null)

  // ── Forgot-password panel ──────────────────────────────────────────────────
  if (mode === 'reset') {
    const success = resetState && 'success' in resetState

    return (
      <div className="flex flex-col gap-4">
        {success ? (
          // Success state — just show the confirmation message.
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm text-zinc-700">
              Controlla la tua casella email. Ti abbiamo inviato un link per reimpostare la password.
            </p>
            <button
              onClick={() => setMode('login')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Torna al login
            </button>
          </div>
        ) : (
          // Email entry form.
          <form action={resetFormAction} className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">
              Inserisci l&apos;email del tuo account e ti invieremo un link per reimpostare la password.
            </p>

            {'error' in (resetState ?? {}) && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                {(resetState as { error: string }).error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-email" className="text-sm font-medium text-zinc-700">
                Email
              </label>
              <input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="nome@azienda.it"
                className={INPUT_CLASS}
              />
            </div>

            <button
              type="submit"
              disabled={isResetPending}
              className={[
                'mt-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors',
                isResetPending ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700',
              ].join(' ')}
            >
              {isResetPending ? 'Invio in corso…' : 'Invia link di reset'}
            </button>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-center text-sm text-zinc-500 hover:text-zinc-700"
            >
              ← Torna al login
            </button>
          </form>
        )}
      </div>
    )
  }

  // ── Login panel ────────────────────────────────────────────────────────────
  return (
    <form action={loginFormAction} className="flex flex-col gap-4">
      {loginState?.error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {loginState.error}
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
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-zinc-700">
            Password
          </label>
          <button
            type="button"
            onClick={() => setMode('reset')}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Password dimenticata?
          </button>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={INPUT_CLASS}
        />
      </div>

      <button
        type="submit"
        disabled={isLoginPending}
        className={[
          'mt-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors',
          isLoginPending ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700',
        ].join(' ')}
      >
        {isLoginPending ? 'Accesso in corso…' : 'Accedi'}
      </button>
    </form>
  )
}

'use client'

import { useState, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction, registerAction } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'

// ── Shared style tokens ───────────────────────────────────────────────────────

const INPUT = [
  'w-full rounded-lg border border-white/10 bg-zinc-800 px-3.5 py-2.5',
  'text-sm text-zinc-100 placeholder:text-zinc-500',
  'focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40',
  'transition-colors',
].join(' ')

const SELECT = [
  'w-full rounded-lg border border-white/10 bg-zinc-800 px-3.5 py-2.5',
  'text-sm text-zinc-100',
  'focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40',
  'transition-colors appearance-none cursor-pointer',
].join(' ')

const LABEL = 'text-sm font-medium text-zinc-400'

const BTN_PRIMARY = (disabled: boolean) => [
  'w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors',
  disabled ? 'bg-blue-600/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500',
].join(' ')

const BTN_GHOST = 'text-sm text-zinc-500 hover:text-zinc-300 transition-colors'
const BTN_LINK  = 'text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors'

const ERROR_BOX = 'rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400'

// ── Security questions ────────────────────────────────────────────────────────

const SECURITY_QUESTIONS = [
  'Come si chiama tua madre?',
  'Quale animale è il tuo preferito?',
  "Qual'è la tua squadra del cuore?",
]

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'login' | 'register' | 'forgot'
type ForgotStep = 'email' | 'method' | 'code'

type LoginState    = { error: string } | null
type RegisterState = { error: string } | { success: true } | null

// ── Field group helper ────────────────────────────────────────────────────────

function Field({
  id, label, children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>{label}</label>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function LoginForm() {
  const [mode, setMode] = useState<Mode>('login')

  // Server-action state
  const [loginState,    loginFormAction,    isLoginPending]    =
    useActionState<LoginState, FormData>(loginAction, null)
  const [registerState, registerFormAction, isRegisterPending] =
    useActionState<RegisterState, FormData>(registerAction, null)

  function switchTo(m: Mode) {
    setMode(m)
  }

  if (mode === 'login')    return <LoginPanel    state={loginState}    action={loginFormAction}    pending={isLoginPending}    onSwitch={switchTo} />
  if (mode === 'register') return <RegisterPanel state={registerState} action={registerFormAction} pending={isRegisterPending} onSwitch={switchTo} />
  return <ForgotPanel onSwitch={switchTo} />
}

// ══════════════════════════════════════════════════════════════════════════════
// Login panel
// ══════════════════════════════════════════════════════════════════════════════

function LoginPanel({
  state, action, pending, onSwitch,
}: {
  state: LoginState
  action: (payload: FormData) => void
  pending: boolean
  onSwitch: (m: Mode) => void
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-white">Accedi</h2>

      {state?.error && <p className={ERROR_BOX}>{state.error}</p>}

      <Field id="email" label="Email">
        <input id="email" name="email" type="email" autoComplete="email"
          required placeholder="nome@azienda.it" className={INPUT} />
      </Field>

      <Field id="password" label="Password">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className={LABEL}>Password</label>
          <button type="button" onClick={() => onSwitch('forgot')} className={BTN_LINK}>
            Password dimenticata?
          </button>
        </div>
        <input id="password" name="password" type="password"
          autoComplete="current-password" required placeholder="••••••••"
          className={INPUT} />
      </Field>

      <button type="submit" disabled={pending} className={BTN_PRIMARY(pending)}>
        {pending ? 'Accesso in corso…' : 'Accedi'}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Non hai un account?{' '}
        <button type="button" onClick={() => onSwitch('register')} className={BTN_LINK}>
          Crea account
        </button>
      </p>
    </form>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Register panel
// ══════════════════════════════════════════════════════════════════════════════

function RegisterPanel({
  state, action, pending, onSwitch,
}: {
  state: RegisterState
  action: (payload: FormData) => void
  pending: boolean
  onSwitch: (m: Mode) => void
}) {
  const success = state && 'success' in state

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
          <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-white">Account creato!</p>
          <p className="mt-1 text-sm text-zinc-500">
            Controlla la tua email per confermare l&apos;account.
          </p>
        </div>
        <button type="button" onClick={() => onSwitch('login')} className={BTN_LINK}>
          Torna al login
        </button>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-white">Crea account</h2>

      {state && 'error' in state && <p className={ERROR_BOX}>{state.error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <Field id="nome" label="Nome">
          <input id="nome" name="nome" type="text" autoComplete="given-name"
            required placeholder="Marco" className={INPUT} />
        </Field>
        <Field id="cognome" label="Cognome">
          <input id="cognome" name="cognome" type="text" autoComplete="family-name"
            required placeholder="Rossi" className={INPUT} />
        </Field>
      </div>

      <Field id="reg-email" label="Email">
        <input id="reg-email" name="email" type="email" autoComplete="email"
          required placeholder="nome@azienda.it" className={INPUT} />
      </Field>

      <Field id="phone" label="Telefono">
        <input id="phone" name="phone" type="tel" autoComplete="tel"
          required placeholder="+39 333 1234567" className={INPUT} />
      </Field>

      <Field id="reg-password" label="Password">
        <input id="reg-password" name="password" type="password"
          autoComplete="new-password" required minLength={8}
          placeholder="Almeno 8 caratteri" className={INPUT} />
      </Field>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="security_question" className={LABEL}>Domanda di sicurezza</label>
        <div className="relative">
          <select id="security_question" name="security_question" required className={SELECT}>
            <option value="" disabled>Scegli una domanda…</option>
            {SECURITY_QUESTIONS.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>
      </div>

      <Field id="security_answer" label="Risposta (verrà salvata in minuscolo)">
        <input id="security_answer" name="security_answer" type="text"
          required placeholder="La tua risposta" className={INPUT} />
      </Field>

      <button type="submit" disabled={pending} className={BTN_PRIMARY(pending)}>
        {pending ? 'Creazione in corso…' : 'Crea account'}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Hai già un account?{' '}
        <button type="button" onClick={() => onSwitch('login')} className={BTN_LINK}>
          Accedi
        </button>
      </p>
    </form>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Forgot-password panel (multi-step)
// ══════════════════════════════════════════════════════════════════════════════

function ForgotPanel({ onSwitch }: { onSwitch: (m: Mode) => void }) {
  const router = useRouter()

  const [step, setStep]           = useState<ForgotStep>('email')
  const [email, setEmail]         = useState('')
  const [method, setMethod]       = useState<'email' | 'sms' | null>(null)
  const [otpPhone, setOtpPhone]   = useState('') // phone from user_metadata, needed for verifyOtp
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [cooldown, setCooldown]   = useState(0)

  // Countdown timer for "Rinvia codice"
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  function clearError() { setError(null) }
  function startCooldown() { setCooldown(60) }

  // ── Step: enter email ───────────────────────────────────────────────────────
  if (step === 'email') {
    async function handleEmail(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      clearError()
      const enteredEmail = (new FormData(e.currentTarget).get('email') as string).trim()
      setIsLoading(true)
      try {
        const res  = await fetch(`/api/auth/check-email?email=${encodeURIComponent(enteredEmail)}`)
        const json = await res.json() as { exists?: boolean; error?: string }
        if (!res.ok) { setError(json.error ?? 'Errore sconosciuto'); return }
        setEmail(enteredEmail)
        setStep('method')
      } catch {
        setError('Errore di rete')
      } finally {
        setIsLoading(false)
      }
    }

    return (
      <form onSubmit={handleEmail} className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-white">Password dimenticata</h2>
        <p className="text-sm text-zinc-500">
          Inserisci la tua email per recuperare l&apos;accesso.
        </p>

        {error && <p className={ERROR_BOX}>{error}</p>}

        <Field id="forgot-email" label="Email">
          <input id="forgot-email" name="email" type="email" autoComplete="email"
            required placeholder="nome@azienda.it" className={INPUT} />
        </Field>

        <button type="submit" disabled={isLoading} className={BTN_PRIMARY(isLoading)}>
          {isLoading ? 'Verifica…' : 'Continua'}
        </button>

        <button type="button" onClick={() => onSwitch('login')} className={`text-center ${BTN_GHOST}`}>
          ← Torna al login
        </button>
      </form>
    )
  }

  // ── Step: choose method ─────────────────────────────────────────────────────
  if (step === 'method') {
    async function handleMethod(selectedMethod: 'email' | 'sms') {
      clearError()
      setIsLoading(true)
      try {
        const res  = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, method: selectedMethod }),
        })
        const json = await res.json() as { success?: boolean; phone?: string; error?: string }
        if (!res.ok) { setError(json.error ?? 'Errore'); return }
        setMethod(selectedMethod)
        if (json.phone) setOtpPhone(json.phone)
        startCooldown()
        setStep('code')
      } catch {
        setError('Errore di rete')
      } finally {
        setIsLoading(false)
      }
    }

    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-white">Come vuoi recuperare l&apos;accesso?</h2>
        <p className="text-sm text-zinc-500">
          Scegli dove ricevere il codice di verifica a 6 cifre.
        </p>

        {error && <p className={ERROR_BOX}>{error}</p>}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleMethod('email')}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-800/60 p-4 text-left transition-colors hover:border-blue-500/30 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-lg">
              📧
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-100">Via email</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Inviamo un codice OTP a 6 cifre a{' '}
                <span className="text-zinc-400">{email}</span>
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleMethod('sms')}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-800/60 p-4 text-left transition-colors hover:border-blue-500/30 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-lg">
              📱
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-100">Via SMS</p>
              <p className="mt-0.5 text-xs text-zinc-500">Inviamo un codice OTP al numero salvato sull&apos;account</p>
            </div>
          </button>
        </div>

        <button type="button" onClick={() => { clearError(); setStep('email') }} className={`text-center ${BTN_GHOST}`}>
          ← Indietro
        </button>
      </div>
    )
  }

  // ── Step: enter OTP code ────────────────────────────────────────────────────
  if (step === 'code') {
    const destination = method === 'email'
      ? email
      : otpPhone.replace(/(\+\d{2})\d+(\d{3})/, '$1•••••$2') // mask middle digits

    async function handleVerifyCode(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      clearError()
      const token = (new FormData(e.currentTarget).get('token') as string).trim()
      setIsLoading(true)
      try {
        const supabase = createClient()
        const { error: verifyError } = method === 'email'
          ? await supabase.auth.verifyOtp({ email, token, type: 'email' })
          : await supabase.auth.verifyOtp({ phone: otpPhone, token, type: 'sms' })

        if (verifyError) { setError('Codice non valido o scaduto'); return }
        router.push('/reset-password')
      } catch {
        setError('Errore di rete')
      } finally {
        setIsLoading(false)
      }
    }

    async function handleResend() {
      if (cooldown > 0 || !method) return
      clearError()
      setIsLoading(true)
      try {
        const res  = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, method }),
        })
        const json = await res.json() as { success?: boolean; error?: string }
        if (!res.ok) { setError(json.error ?? 'Errore'); return }
        startCooldown()
      } catch {
        setError('Errore di rete')
      } finally {
        setIsLoading(false)
      }
    }

    return (
      <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-white">Inserisci il codice</h2>
        <p className="text-sm text-zinc-500">
          Abbiamo inviato un codice a 6 cifre a{' '}
          <span className="text-zinc-300">{destination}</span>.
        </p>

        {error && <p className={ERROR_BOX}>{error}</p>}

        <Field id="otp-token" label="Codice OTP">
          <input
            id="otp-token"
            name="token"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            placeholder="000000"
            className={`${INPUT} tracking-widest text-center text-lg font-mono`}
          />
        </Field>

        <button type="submit" disabled={isLoading} className={BTN_PRIMARY(isLoading)}>
          {isLoading ? 'Verifica…' : 'Verifica codice'}
        </button>

        <div className="text-center">
          {cooldown > 0 ? (
            <span className="text-sm text-zinc-500">
              Rinvia codice in {cooldown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isLoading}
              className={BTN_LINK}
            >
              Rinvia codice
            </button>
          )}
        </div>

        <button type="button" onClick={() => { clearError(); setStep('method') }} className={`text-center ${BTN_GHOST}`}>
          ← Indietro
        </button>
      </form>
    )
  }

  // Fallback (shouldn't be reached)
  return null
}

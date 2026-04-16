'use client'

import { useState, useActionState } from 'react'
import { loginAction, registerAction } from '@/app/actions/auth'

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
const INFO_BOX  = 'rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-300'

// ── Security questions ────────────────────────────────────────────────────────

const SECURITY_QUESTIONS = [
  'Come si chiama tua madre?',
  'Quale animale è il tuo preferito?',
  "Qual'è la tua squadra del cuore?",
]

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'login' | 'register' | 'forgot'
type ForgotStep = 'email' | 'method' | 'security' | 'sms-phone' | 'sms-code' | 'success'

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
  const [step, setStep]           = useState<ForgotStep>('email')
  const [email, setEmail]         = useState('')
  const [question, setQuestion]   = useState('')
  const [phone, setPhone]         = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  function clearError() { setError(null) }

  // ── Step: enter email ───────────────────────────────────────────────────────
  if (step === 'email') {
    async function handleEmail(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      clearError()
      const fd = new FormData(e.currentTarget)
      const enteredEmail = (fd.get('email') as string).trim()
      setIsLoading(true)

      try {
        const res = await fetch(`/api/auth/security-question?email=${encodeURIComponent(enteredEmail)}`)
        const json = await res.json() as { question?: string; error?: string }
        if (!res.ok) {
          // If no security question, still allow going to method (SMS-only)
          if (res.status === 404 && json.error?.includes('Domanda')) {
            setEmail(enteredEmail)
            setStep('method')
            return
          }
          setError(json.error ?? 'Errore sconosciuto')
          return
        }
        setEmail(enteredEmail)
        setQuestion(json.question!)
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
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-white">Come vuoi recuperare l&apos;accesso?</h2>
        <p className="text-sm text-zinc-500">Scegli il metodo di verifica.</p>

        <div className="flex flex-col gap-2">
          {question && (
            <button
              type="button"
              onClick={() => setStep('security')}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-800/60 p-4 text-left transition-colors hover:border-blue-500/30 hover:bg-zinc-800"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
                <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-100">Domanda di sicurezza</p>
                <p className="mt-0.5 text-xs text-zinc-500">Rispondi alla domanda impostata durante la registrazione</p>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={() => setStep('sms-phone')}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-800/60 p-4 text-left transition-colors hover:border-blue-500/30 hover:bg-zinc-800"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
              <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-100">SMS</p>
              <p className="mt-0.5 text-xs text-zinc-500">Ricevi un codice via SMS sul numero registrato</p>
            </div>
          </button>
        </div>

        <button type="button" onClick={() => setStep('email')} className={`text-center ${BTN_GHOST}`}>
          ← Indietro
        </button>
      </div>
    )
  }

  // ── Step: security question ─────────────────────────────────────────────────
  if (step === 'security') {
    async function handleSecurity(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      clearError()
      const fd = new FormData(e.currentTarget)
      const answer      = fd.get('answer')      as string
      const newPassword = fd.get('newPassword') as string
      const confirm     = fd.get('confirm')     as string

      if (newPassword !== confirm) { setError('Le password non corrispondono'); return }

      setIsLoading(true)
      try {
        const res  = await fetch('/api/auth/verify-security', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, answer, newPassword }),
        })
        const json = await res.json() as { success?: boolean; error?: string }
        if (!res.ok) { setError(json.error ?? 'Errore'); return }
        setStep('success')
      } catch {
        setError('Errore di rete')
      } finally {
        setIsLoading(false)
      }
    }

    return (
      <form onSubmit={handleSecurity} className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-white">Domanda di sicurezza</h2>

        {error && <p className={ERROR_BOX}>{error}</p>}

        <div className={`${INFO_BOX} text-zinc-300`}>
          <span className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">Domanda</span>
          {question}
        </div>

        <Field id="sec-answer" label="Risposta">
          <input id="sec-answer" name="answer" type="text"
            required placeholder="La tua risposta" className={INPUT} />
        </Field>

        <div className="border-t border-white/[0.06] pt-4">
          <p className="mb-3 text-sm font-medium text-zinc-400">Nuova password</p>
          <div className="flex flex-col gap-3">
            <Field id="sec-newpw" label="Password">
              <input id="sec-newpw" name="newPassword" type="password"
                required minLength={8} placeholder="Almeno 8 caratteri" className={INPUT} />
            </Field>
            <Field id="sec-confirm" label="Conferma password">
              <input id="sec-confirm" name="confirm" type="password"
                required placeholder="Ripeti la password" className={INPUT} />
            </Field>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className={BTN_PRIMARY(isLoading)}>
          {isLoading ? 'Verifica…' : 'Verifica e aggiorna password'}
        </button>

        <button type="button" onClick={() => { clearError(); setStep('method') }} className={`text-center ${BTN_GHOST}`}>
          ← Indietro
        </button>
      </form>
    )
  }

  // ── Step: SMS — enter phone ─────────────────────────────────────────────────
  if (step === 'sms-phone') {
    async function handleSendOtp(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      clearError()
      const fd           = new FormData(e.currentTarget)
      const enteredPhone = (fd.get('phone') as string).trim()
      setIsLoading(true)
      try {
        const res  = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, phone: enteredPhone }),
        })
        const json = await res.json() as { success?: boolean; error?: string }
        if (!res.ok) { setError(json.error ?? 'Errore'); return }
        setPhone(enteredPhone)
        setStep('sms-code')
      } catch {
        setError('Errore di rete')
      } finally {
        setIsLoading(false)
      }
    }

    return (
      <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-white">Verifica via SMS</h2>
        <p className="text-sm text-zinc-500">
          Inserisci il numero di telefono registrato. Ti invieremo un codice OTP.
        </p>

        {error && <p className={ERROR_BOX}>{error}</p>}

        <Field id="sms-phone" label="Numero di telefono">
          <input id="sms-phone" name="phone" type="tel" autoComplete="tel"
            required placeholder="+39 333 1234567" className={INPUT} />
        </Field>

        <button type="submit" disabled={isLoading} className={BTN_PRIMARY(isLoading)}>
          {isLoading ? 'Invio in corso…' : 'Invia codice SMS'}
        </button>

        <button type="button" onClick={() => { clearError(); setStep('method') }} className={`text-center ${BTN_GHOST}`}>
          ← Indietro
        </button>
      </form>
    )
  }

  // ── Step: SMS — enter OTP + new password ────────────────────────────────────
  if (step === 'sms-code') {
    async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      clearError()
      const fd          = new FormData(e.currentTarget)
      const token       = (fd.get('token') as string).trim()
      const newPassword = fd.get('newPassword') as string
      const confirm     = fd.get('confirm')     as string

      if (newPassword !== confirm) { setError('Le password non corrispondono'); return }

      setIsLoading(true)
      try {
        const res  = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, phone, token, newPassword }),
        })
        const json = await res.json() as { success?: boolean; error?: string }
        if (!res.ok) { setError(json.error ?? 'Errore'); return }
        setStep('success')
      } catch {
        setError('Errore di rete')
      } finally {
        setIsLoading(false)
      }
    }

    return (
      <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-white">Inserisci il codice</h2>
        <p className="text-sm text-zinc-500">
          Abbiamo inviato un codice a 6 cifre al numero{' '}
          <span className="text-zinc-300">{phone}</span>.
        </p>

        {error && <p className={ERROR_BOX}>{error}</p>}

        <Field id="otp-token" label="Codice OTP">
          <input id="otp-token" name="token" type="text" inputMode="numeric"
            autoComplete="one-time-code" required maxLength={6}
            placeholder="000000" className={`${INPUT} tracking-widest text-center text-lg font-mono`} />
        </Field>

        <div className="border-t border-white/[0.06] pt-4">
          <p className="mb-3 text-sm font-medium text-zinc-400">Nuova password</p>
          <div className="flex flex-col gap-3">
            <Field id="otp-newpw" label="Password">
              <input id="otp-newpw" name="newPassword" type="password"
                required minLength={8} placeholder="Almeno 8 caratteri" className={INPUT} />
            </Field>
            <Field id="otp-confirm" label="Conferma password">
              <input id="otp-confirm" name="confirm" type="password"
                required placeholder="Ripeti la password" className={INPUT} />
            </Field>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className={BTN_PRIMARY(isLoading)}>
          {isLoading ? 'Verifica…' : 'Verifica e aggiorna password'}
        </button>

        <button type="button" onClick={() => { clearError(); setStep('sms-phone') }} className={`text-center ${BTN_GHOST}`}>
          Non hai ricevuto il codice? Riprova
        </button>
      </form>
    )
  }

  // ── Step: success ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
        <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <div>
        <p className="font-medium text-white">Password aggiornata!</p>
        <p className="mt-1 text-sm text-zinc-500">
          Puoi ora accedere con la tua nuova password.
        </p>
      </div>
      <button type="button" onClick={() => onSwitch('login')} className={BTN_LINK}>
        Vai al login
      </button>
    </div>
  )
}

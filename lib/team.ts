// ─── Operator model ────────────────────────────────────────────────────────────

export interface Operator {
  id: string       // stored in messages.assigned_to; use email for real users
  name: string
  initials: string
  color: string    // tailwind bg-* class for avatar
}

// ─── Static team members (demo / default) ─────────────────────────────────────

export const STATIC_OPERATORS: Operator[] = [
  { id: 'marco.r@team.dev',  name: 'Marco R.',  initials: 'MR', color: 'bg-violet-500' },
  { id: 'sofia.b@team.dev',  name: 'Sofia B.',  initials: 'SB', color: 'bg-pink-500'   },
  { id: 'luca.m@team.dev',   name: 'Luca M.',   initials: 'LM', color: 'bg-amber-500'  },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-teal-500', 'bg-indigo-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-fuchsia-500',
]

/** Derives a deterministic Operator entry from any email address. */
export function operatorFromEmail(email: string): Operator {
  const hash = email.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length]
  const local = email.split('@')[0]
  const parts = local.split(/[._-]/).filter(Boolean)
  const name = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') || local
  const initials = parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
  return { id: email, name, initials, color }
}

/**
 * Returns the full operator list for the given logged-in user.
 * Prepends the current user if they are not already in STATIC_OPERATORS.
 */
export function buildOperatorList(currentUserEmail: string): Operator[] {
  const already = STATIC_OPERATORS.some((op) => op.id === currentUserEmail)
  if (already) return STATIC_OPERATORS
  return [operatorFromEmail(currentUserEmail), ...STATIC_OPERATORS]
}

/** Looks up an operator by id from a list, or falls back to a derived entry. */
export function findOperator(id: string | null | undefined, list: Operator[]): Operator | null {
  if (!id) return null
  return list.find((op) => op.id === id) ?? operatorFromEmail(id)
}

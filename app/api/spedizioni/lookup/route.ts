/**
 * POST /api/spedizioni/lookup
 *
 * Extracts the first SP-YYYY-NNN code from the provided message text,
 * then looks it up in the spedizioni table.
 *
 * Request body: { subject: string; body: string }
 * Response:     { numero: string | null; spedizione: Spedizione | null }
 *
 * - numero is set whenever the SP-XXXX-XXX pattern is found in the text,
 *   regardless of whether a DB record exists.
 * - spedizione is null when the pattern is absent or no row matches.
 */

import { NextRequest, NextResponse } from 'next/server'
import { findSpedizioneInMessage } from '@/lib/logistics/spedizione-lookup'

export async function POST(req: NextRequest) {
  let body: { subject?: string; body?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const subject = body.subject ?? ''
  const text    = body.body ?? ''

  try {
    const result = await findSpedizioneInMessage({ subject, body: text })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[spedizioni/lookup]', err)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}

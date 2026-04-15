/**
 * POST /api/messages/ingest
 *
 * Saves a new message to the database, then calls Claude to generate
 * a Logistics Token (token_code + 3 notions), and updates the record.
 *
 * Authorization: Bearer <INGEST_SECRET>
 *
 * Request body: MessageInsert (minus id, created_at, token fields)
 * Response: the full saved Message row (with token fields populated)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { tokenizeMessage } from '@/lib/logistics/tokenize'
import type { MessageInsert } from '@/types/database'

export async function POST(req: NextRequest) {
  // ── Authorization ──────────────────────────────────────────────────────────
  const secret = process.env.INGEST_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'INGEST_SECRET not configured' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: MessageInsert
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const db = createServiceClient()

  // ── Insert the message (without token fields yet) ──────────────────────────
  const { data: inserted, error: insertError } = await db
    .from('messages')
    .insert(body)
    .select()
    .single()

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Insert failed' },
      { status: 500 },
    )
  }

  // ── Tokenize via Claude ────────────────────────────────────────────────────
  let tokenData
  try {
    tokenData = await tokenizeMessage({
      subject:    inserted.subject,
      body:       inserted.body,
      from_name:  inserted.from_name,
      from_email: inserted.from_email,
    })
  } catch (err) {
    console.error('[ingest] tokenize failed:', err)
    // Return the message without token fields rather than failing the whole request
    return NextResponse.json(inserted)
  }

  // ── Update the message with token fields ───────────────────────────────────
  const { data: enriched, error: updateError } = await db
    .from('messages')
    .update(tokenData as unknown as Record<string, unknown>)
    .eq('id', inserted.id)
    .select()
    .single()

  if (updateError || !enriched) {
    console.error('[ingest] token update failed:', updateError?.message)
    return NextResponse.json(inserted)
  }

  return NextResponse.json(enriched, { status: 201 })
}

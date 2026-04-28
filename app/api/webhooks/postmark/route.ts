/**
 * POST /api/webhooks/postmark
 *
 * Receives Postmark inbound email webhooks, creates a message in the DB,
 * then runs the logistics tokenization pipeline.
 *
 * Auth: optional POSTMARK_WEBHOOK_TOKEN checked against X-Webhook-Token header
 * or ?token= query param. If the env var is not set, the endpoint is open.
 *
 * Postmark retries on non-2xx responses — always return 200 once the payload
 * is structurally valid, even if tokenization fails.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { tokenizeMessage } from '@/lib/logistics/tokenize'

// ─── Postmark inbound payload types ──────────────────────────────────────────

interface PostmarkAddress {
  Email: string
  Name: string
  MailboxHash: string
}

interface PostmarkInboundPayload {
  MessageID: string
  Date: string
  Subject: string
  FromName: string
  From: string
  FromFull: PostmarkAddress
  To: string
  ToFull: PostmarkAddress[]
  TextBody: string
  HtmlBody: string
  ReplyTo?: string
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const expectedToken = process.env.POSTMARK_WEBHOOK_TOKEN
  if (expectedToken) {
    const provided =
      req.headers.get('x-webhook-token') ??
      req.nextUrl.searchParams.get('token')
    if (provided !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // ── Parse payload ──────────────────────────────────────────────────────────
  let payload: PostmarkInboundPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!payload.MessageID || !payload.FromFull?.Email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // ── Resolve recipient email account ───────────────────────────────────────
  const toEmail =
    payload.ToFull?.[0]?.Email ??
    payload.To?.split(',')[0].trim().replace(/^.*<(.+)>$/, '$1') ??
    ''

  const db = createServiceClient()

  const { data: emailAccount } = await db
    .from('email_accounts')
    .select('id, company_id')
    .eq('email', toEmail)
    .maybeSingle()

  if (!emailAccount) {
    // Postmark would retry on non-2xx — return 422 so it stops retrying
    // for addresses we don't manage.
    return NextResponse.json(
      { error: `No email account for recipient: ${toEmail}` },
      { status: 422 },
    )
  }

  // ── Deduplicate: skip if MessageID already exists ─────────────────────────
  const { data: existing } = await db
    .from('messages')
    .select('id')
    .eq('external_message_id', payload.MessageID)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  // ── Build message row ──────────────────────────────────────────────────────
  const body = payload.TextBody?.trim() || stripHtml(payload.HtmlBody ?? '')

  const messageInsert = {
    company_id: emailAccount.company_id,
    email_account_id: emailAccount.id,
    external_message_id: payload.MessageID,
    thread_id: null,
    subject: payload.Subject || '(nessun oggetto)',
    body,
    from_email: payload.FromFull.Email,
    from_name: payload.FromFull.Name || null,
    to_email: toEmail,
    assigned_to: null,
    status: 'arrived' as const,
    channel: 'email' as const,
    received_at: payload.Date ? new Date(payload.Date).toISOString() : new Date().toISOString(),
  }

  const { data: inserted, error: insertError } = await db
    .from('messages')
    .insert(messageInsert)
    .select()
    .single()

  if (insertError || !inserted) {
    console.error('[postmark-webhook] insert failed:', insertError?.message)
    return NextResponse.json({ error: insertError?.message ?? 'Insert failed' }, { status: 500 })
  }

  // ── Tokenize (fire-and-forget style, failure is non-fatal) ────────────────
  try {
    const tokenData = await tokenizeMessage({
      subject: inserted.subject,
      body: inserted.body,
      from_name: inserted.from_name,
      from_email: inserted.from_email,
    })

    await db
      .from('messages')
      .update(tokenData as unknown as Record<string, unknown>)
      .eq('id', inserted.id)
  } catch (err) {
    console.error('[postmark-webhook] tokenize failed:', err)
  }

  return NextResponse.json({ ok: true, id: inserted.id })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

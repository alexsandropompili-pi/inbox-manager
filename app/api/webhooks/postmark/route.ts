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

interface PostmarkHeader {
  Name: string
  Value: string
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
  Headers?: PostmarkHeader[]
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

  // Try exact match first, then fall back to the OriginalRecipient header
  // (Postmark sets this to the real destination when a custom inbound domain
  // is not yet configured and emails arrive via the shared inbound address).
  let { data: emailAccount } = await db
    .from('email_accounts')
    .select('id, company_id')
    .eq('email', toEmail)
    .maybeSingle()

  if (!emailAccount) {
    const originalRecipient = payload.Headers?.find(
      h => h.Name === 'X-Forwarded-To' || h.Name === 'X-Original-To',
    )?.Value ?? null

    if (originalRecipient) {
      const clean = originalRecipient.trim().replace(/^.*<(.+)>$/, '$1')
      const { data: fallback } = await db
        .from('email_accounts')
        .select('id, company_id')
        .eq('email', clean)
        .maybeSingle()
      if (fallback) emailAccount = fallback
    }
  }

  if (!emailAccount) {
    // Last resort: if there is exactly one email account configured, use it.
    // This covers the case where the domain MX is not yet set up and emails
    // arrive via the shared Postmark inbound address.
    const { data: accounts } = await db
      .from('email_accounts')
      .select('id, company_id')
      .limit(2)

    if (accounts?.length === 1) {
      emailAccount = accounts[0]
    }
  }

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

  // ── Thread detection via In-Reply-To header ────────────────────────────────
  const inReplyToRaw = payload.Headers?.find(h => h.Name === 'In-Reply-To')?.Value ?? null
  const inReplyTo = inReplyToRaw?.replace(/^<|>$/g, '') ?? null

  let threadId: string | null = null

  if (inReplyTo) {
    const { data: originalMessage } = await db
      .from('messages')
      .select('id, status, replied_at, thread_id')
      .eq('external_message_id', inReplyTo)
      .maybeSingle()

    if (originalMessage) {
      const rootId = originalMessage.thread_id ?? originalMessage.id
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const withinWindow =
        !originalMessage.replied_at || originalMessage.replied_at > sevenDaysAgo

      if (originalMessage.status === 'replied' && withinWindow) {
        await db
          .from('messages')
          .update({ status: 'arrived', replied_at: null })
          .eq('id', rootId)
        threadId = rootId
      }
      // If outside 7-day window or not replied: create a new standalone ticket
    }
  }

  // ── Build message row ──────────────────────────────────────────────────────
  const body = payload.TextBody?.trim() || stripHtml(payload.HtmlBody ?? '')

  const messageInsert = {
    company_id: emailAccount.company_id,
    email_account_id: emailAccount.id,
    external_message_id: payload.MessageID,
    thread_id: threadId,
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

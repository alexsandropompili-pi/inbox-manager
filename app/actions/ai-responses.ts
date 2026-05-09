'use server'

import { revalidatePath } from 'next/cache'
import { getAiResponsesByMessageId, createAiResponse } from '@/lib/db/ai-responses'
import { getMessageById, markAsReplied, updateMessage } from '@/lib/db/messages'
import { createServiceClient } from '@/lib/supabase/service'
import { sendReply } from '@/lib/email/send'
import type { OutboundAttachment } from '@/lib/email/send'
import type { AiResponse, MessageAttachment } from '@/types/database'

export async function getResponseHistoryAction(messageId: string): Promise<AiResponse[]> {
  return getAiResponsesByMessageId(messageId)
}

type ApproveResult =
  | { ok: true; data: AiResponse }
  | { ok: false; error: string }

export async function approveAndSendAction(
  rootMessageId: string,
  replyToMessageId: string,
  companyId: string,
  content: string,
  rawAttachments?: OutboundAttachment[],
): Promise<ApproveResult> {
  try {
    const replyToMessage = await getMessageById(replyToMessageId)
    if (!replyToMessage) return { ok: false, error: 'Messaggio non trovato' }

    const db = createServiceClient()
    let fromEmail = process.env.POSTMARK_REPLY_FROM ?? null

    if (!fromEmail && replyToMessage.email_account_id) {
      const { data: emailAccount } = await db
        .from('email_accounts')
        .select('email')
        .eq('id', replyToMessage.email_account_id)
        .maybeSingle()
      fromEmail = emailAccount?.email ?? null
    }

    if (!fromEmail) {
      return { ok: false, error: 'Indirizzo mittente non configurato (imposta POSTMARK_REPLY_FROM)' }
    }

    // ── Upload outbound attachments to Storage ─────────────────────────────
    const storedAttachments: MessageAttachment[] = []
    for (const att of rawAttachments ?? []) {
      try {
        const buffer = Buffer.from(att.content, 'base64')
        const safeName = att.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${companyId}/${replyToMessageId}/sent/${Date.now()}-${safeName}`
        const { error } = await db.storage
          .from('attachments')
          .upload(storagePath, buffer, { contentType: att.contentType, upsert: false })
        if (!error) {
          const { data: { publicUrl } } = db.storage.from('attachments').getPublicUrl(storagePath)
          storedAttachments.push({
            name: att.name,
            content_type: att.contentType,
            size: buffer.length,
            storage_path: storagePath,
            public_url: publicUrl,
          })
        }
      } catch (err) {
        console.error('[approveAndSendAction] attachment upload failed:', err)
      }
    }

    await sendReply({
      from: fromEmail,
      to: replyToMessage.from_email,
      subject: replyToMessage.subject,
      body: content,
      inReplyTo: replyToMessage.external_message_id,
      attachments: rawAttachments,
    })

    const aiResponse = await createAiResponse({
      message_id: replyToMessageId,
      generated_text: content,
      final_text: content,
      review_status: 'sent',
      attachments: storedAttachments.length > 0 ? storedAttachments : null,
    })

    await updateMessage(rootMessageId, { status: 'in_progress' })
    revalidatePath('/')

    return { ok: true, data: aiResponse }
  } catch (err) {
    let message: string
    if (err instanceof Error) {
      message = err.message
    } else if (err !== null && typeof err === 'object') {
      const e = err as Record<string, unknown>
      const parts = [
        e.message ? 'message: ' + String(e.message) : null,
        e.code    ? 'code: '    + String(e.code)    : null,
        e.details ? 'details: ' + String(e.details) : null,
        e.hint    ? 'hint: '    + String(e.hint)    : null,
      ].filter(Boolean)
      message = parts.length ? parts.join(' | ') : 'Errore non serializzabile'
    } else {
      message = String(err)
    }
    console.error('[approveAndSendAction ERROR]', message, err)
    return { ok: false, error: message }
  }
}

export async function rejectResponseAction(
  messageId: string,
  content: string,
): Promise<AiResponse> {
  const aiResponse = await createAiResponse({
    message_id: messageId,
    generated_text: content,
    final_text: null,
    review_status: 'rejected',
  })
  return aiResponse
}

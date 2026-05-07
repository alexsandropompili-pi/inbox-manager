'use server'

import { revalidatePath } from 'next/cache'
import { getAiResponsesByMessageId, createAiResponse } from '@/lib/db/ai-responses'
import { getMessageById, markAsReplied } from '@/lib/db/messages'
import { createServiceClient } from '@/lib/supabase/service'
import { sendReply } from '@/lib/email/send'
import type { AiResponse } from '@/types/database'

export async function getResponseHistoryAction(messageId: string): Promise<AiResponse[]> {
  return getAiResponsesByMessageId(messageId)
}

type ApproveResult =
  | { ok: true;  data: AiResponse }
  | { ok: false; error: string }

export async function approveAndSendAction(
  rootMessageId: string,
  replyToMessageId: string,
  companyId: string,
  content: string,
): Promise<ApproveResult> {
  try {
    // Load the message to reply to (last in thread, or root if no thread)
    const replyToMessage = await getMessageById(replyToMessageId)
    if (!replyToMessage) return { ok: false, error: 'Messaggio non trovato' }

    // Resolve the "From" address: env var > email_account lookup > error
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

    await sendReply({
      from: fromEmail,
      to: replyToMessage.from_email,
      subject: replyToMessage.subject,
      body: content,
      inReplyTo: replyToMessage.external_message_id,
    })

    // Persist response linked to the specific message we replied to
    const aiResponse = await createAiResponse({
      message_id: replyToMessageId,
      company_id: companyId,
      content,
      status: 'sent',
    })

    // Mark root as replied (sets replied_at)
    await markAsReplied(rootMessageId)
    revalidatePath('/')

    return { ok: true, data: aiResponse }
  } catch (err) {
    let message: string
    if (err instanceof Error) {
      message = err.message
    } else if (typeof err === 'object' && err !== null) {
      try { message = JSON.stringify(err) } catch { message = String(err) }
    } else {
      message = String(err)
    }
    console.error('[approveAndSendAction]', message)
    return { ok: false, error: message }
  }
}

export async function rejectResponseAction(
  messageId: string,
  companyId: string,
  content: string,
): Promise<AiResponse> {
  const aiResponse = await createAiResponse({
    message_id: messageId,
    company_id: companyId,
    content,
    status: 'rejected',
  })

  return aiResponse
}

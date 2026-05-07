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

export async function approveAndSendAction(
  rootMessageId: string,
  replyToMessageId: string,
  companyId: string,
  content: string,
): Promise<AiResponse> {
  // Load the message to reply to (last in thread, or root if no thread)
  const replyToMessage = await getMessageById(replyToMessageId)
  if (!replyToMessage) throw new Error('Messaggio non trovato')

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
    throw new Error('Indirizzo mittente non configurato (imposta POSTMARK_REPLY_FROM)')
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

  return aiResponse
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

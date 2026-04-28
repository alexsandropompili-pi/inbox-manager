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
  messageId: string,
  companyId: string,
  content: string,
): Promise<AiResponse> {
  // Load the original message for reply metadata
  const message = await getMessageById(messageId)
  if (!message) throw new Error('Messaggio non trovato')

  // Load the email account to get the "From" address
  const db = createServiceClient()
  const { data: emailAccount, error: accountError } = await db
    .from('email_accounts')
    .select('email')
    .eq('id', message.email_account_id)
    .maybeSingle()

  if (accountError || !emailAccount) {
    throw new Error('Account email mittente non trovato')
  }

  // Send via Postmark — POSTMARK_REPLY_FROM overrides the account email
  // (useful when the inbound address differs from the verified sender signature)
  await sendReply({
    from: process.env.POSTMARK_REPLY_FROM ?? emailAccount.email,
    to: message.from_email,
    subject: message.subject,
    body: content,
    inReplyTo: message.external_message_id,
  })

  // Persist the sent response and update message status
  const aiResponse = await createAiResponse({
    message_id: messageId,
    company_id: companyId,
    content,
    status: 'sent',
  })

  await markAsReplied(messageId)
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

'use server'

import { revalidatePath } from 'next/cache'
import { getAiResponsesByMessageId, createAiResponse } from '@/lib/db/ai-responses'
import { markAsRead } from '@/lib/db/messages'
import type { AiResponse } from '@/types/database'

export async function getResponseHistoryAction(messageId: string): Promise<AiResponse[]> {
  return getAiResponsesByMessageId(messageId)
}

export async function approveAndSendAction(
  messageId: string,
  companyId: string,
  content: string,
): Promise<AiResponse> {
  const aiResponse = await createAiResponse({
    message_id: messageId,
    company_id: companyId,
    content,
    status: 'sent',
  })

  await markAsRead(messageId)
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

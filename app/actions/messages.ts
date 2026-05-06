'use server'

import { updateMessage, getMessagesByFromEmail, getThreadMessages } from '@/lib/db/messages'
import { revalidatePath } from 'next/cache'
import type { KanbanStatus, Message } from '@/types/database'

export async function moveMessageAction(id: string, status: KanbanStatus): Promise<void> {
  await updateMessage(id, { status })
  revalidatePath('/')
}

export async function assignMessageAction(
  id: string,
  assignedTo: string | null,
): Promise<void> {
  await updateMessage(id, { assigned_to: assignedTo })
  revalidatePath('/')
}

export async function getClientHistoryAction(
  companyId: string,
  fromEmail: string,
  excludeId: string,
): Promise<Message[]> {
  return getMessagesByFromEmail(companyId, fromEmail, excludeId)
}

export async function getThreadMessagesAction(rootId: string): Promise<Message[]> {
  return getThreadMessages(rootId)
}

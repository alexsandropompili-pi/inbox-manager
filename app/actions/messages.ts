'use server'

import { updateMessage } from '@/lib/db/messages'
import { revalidatePath } from 'next/cache'
import type { KanbanStatus } from '@/types/database'

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

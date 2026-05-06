import { createServiceClient } from '@/lib/supabase/service'
import type { Message, MessageInsert, MessageUpdate, MessageStatus } from '@/types/database'

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getMessages(companyId: string): Promise<Message[]> {
  const { data, error } = await createServiceClient()
    .from('messages')
    .select('*')
    .eq('company_id', companyId)
    .is('thread_id', null)
    .order('received_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getMessageById(id: string): Promise<Message | null> {
  const { data, error } = await createServiceClient()
    .from('messages')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // row not found
    throw error
  }
  return data
}

export async function getMessagesByStatus(
  companyId: string,
  status: MessageStatus,
): Promise<Message[]> {
  const { data, error } = await createServiceClient()
    .from('messages')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', status)
    .order('received_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getMessagesByEmailAccount(
  emailAccountId: string,
): Promise<Message[]> {
  const { data, error } = await createServiceClient()
    .from('messages')
    .select('*')
    .eq('email_account_id', emailAccountId)
    .order('received_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getMessageThread(threadId: string): Promise<Message[]> {
  const { data, error } = await createServiceClient()
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('received_at', { ascending: true })

  if (error) throw error
  return data
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createMessage(input: MessageInsert): Promise<Message> {
  const { data, error } = await createServiceClient()
    .from('messages')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateMessage(
  id: string,
  updates: MessageUpdate,
): Promise<Message> {
  const { data, error } = await createServiceClient()
    .from('messages')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function markAsRead(id: string): Promise<Message> {
  return updateMessage(id, { status: 'in_progress' })
}

export async function markAsReplied(id: string): Promise<Message> {
  return updateMessage(id, { status: 'replied', replied_at: new Date().toISOString() })
}

export async function getThreadMessages(rootId: string): Promise<Message[]> {
  const { data, error } = await createServiceClient()
    .from('messages')
    .select('*')
    .or(`id.eq.${rootId},thread_id.eq.${rootId}`)
    .order('received_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getMessageByExternalId(externalId: string): Promise<Message | null> {
  const { data, error } = await createServiceClient()
    .from('messages')
    .select('*')
    .eq('external_message_id', externalId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function archiveMessage(id: string): Promise<Message> {
  return updateMessage(id, { status: 'archived' })
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await createServiceClient().from('messages').delete().eq('id', id)
  if (error) throw error
}

export async function getMessagesByFromEmail(
  companyId: string,
  fromEmail: string,
  excludeId: string,
  limit = 10,
): Promise<Message[]> {
  const { data, error } = await createServiceClient()
    .from('messages')
    .select('*')
    .eq('company_id', companyId)
    .eq('from_email', fromEmail)
    .neq('id', excludeId)
    .order('received_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

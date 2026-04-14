import { supabase } from '@/lib/supabase'
import type { Message, MessageInsert, MessageUpdate, MessageStatus } from '@/types/database'

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getMessages(companyId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('company_id', companyId)
    .order('received_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getMessageById(id: string): Promise<Message | null> {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('email_account_id', emailAccountId)
    .order('received_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getMessageThread(threadId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('received_at', { ascending: true })

  if (error) throw error
  return data
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createMessage(input: MessageInsert): Promise<Message> {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('messages')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function markAsRead(id: string): Promise<Message> {
  return updateMessage(id, { status: 'read' })
}

export async function markAsReplied(id: string): Promise<Message> {
  return updateMessage(id, { status: 'replied' })
}

export async function archiveMessage(id: string): Promise<Message> {
  return updateMessage(id, { status: 'archived' })
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase.from('messages').delete().eq('id', id)
  if (error) throw error
}

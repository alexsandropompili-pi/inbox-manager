import { supabase } from '@/lib/supabase'
import type { AiResponse, AiResponseInsert, AiResponseUpdate } from '@/types/database'

export async function getAiResponsesByMessageId(messageId: string): Promise<AiResponse[]> {
  const { data, error } = await supabase
    .from('ai_responses')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createAiResponse(input: AiResponseInsert): Promise<AiResponse> {
  const { data, error } = await supabase
    .from('ai_responses')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAiResponse(
  id: string,
  updates: AiResponseUpdate,
): Promise<AiResponse> {
  const { data, error } = await supabase
    .from('ai_responses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

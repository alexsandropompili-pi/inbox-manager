export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ─── Row types (what Supabase returns) ────────────────────────────────────────

export interface Company {
  id: string
  name: string
  domain: string | null
  created_at: string
}

export interface EmailAccount {
  id: string
  company_id: string
  email: string
  provider: 'gmail' | 'outlook' | 'other'
  access_token: string | null
  refresh_token: string | null
  created_at: string
}

export type MessageStatus = 'unread' | 'read' | 'replied' | 'archived'
export type KanbanStatus = Extract<MessageStatus, 'unread' | 'read' | 'replied'>
export type MessagePriority = 'high' | 'medium' | 'low'
export type MessageChannel = 'email' | 'whatsapp'

export interface Message {
  id: string
  company_id: string
  email_account_id: string
  external_message_id: string
  thread_id: string | null
  subject: string
  body: string
  from_email: string
  from_name: string | null
  to_email: string
  status: MessageStatus
  priority: MessagePriority | null
  channel: MessageChannel | null
  received_at: string
  created_at: string
}

export type AiResponseStatus = 'draft' | 'sent' | 'rejected'

export interface AiResponse {
  id: string
  message_id: string
  company_id: string
  content: string
  status: AiResponseStatus
  created_at: string
}

// ─── Insert types (what you pass when creating rows) ──────────────────────────

export type CompanyInsert = Omit<Company, 'id' | 'created_at'> & {
  id?: string
}

export type EmailAccountInsert = Omit<EmailAccount, 'id' | 'created_at'> & {
  id?: string
}

export type MessageInsert = Omit<Message, 'id' | 'created_at' | 'priority' | 'channel'> & {
  id?: string
  priority?: MessagePriority | null
  channel?: MessageChannel | null
}

export type AiResponseInsert = Omit<AiResponse, 'id' | 'created_at'> & {
  id?: string
}

// ─── Update types (all fields optional except id) ─────────────────────────────

export type MessageUpdate = Partial<Omit<Message, 'id' | 'created_at'>>

export type AiResponseUpdate = Partial<Omit<AiResponse, 'id' | 'created_at'>>

// ─── Helpers to make typed interfaces satisfy Record<string, unknown> ─────────
// Supabase's GenericTable requires Row/Insert/Update to extend Record<string, unknown>.
// Intersecting with Record<string, unknown> adds the required index signature
// while keeping all the specific named property types.

type WithIndex<T> = T & Record<string, unknown>

// ─── Supabase database schema ─────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: WithIndex<Company>
        Insert: WithIndex<CompanyInsert>
        Update: WithIndex<Partial<CompanyInsert>>
        Relationships: []
      }
      email_accounts: {
        Row: WithIndex<EmailAccount>
        Insert: WithIndex<EmailAccountInsert>
        Update: WithIndex<Partial<EmailAccountInsert>>
        Relationships: []
      }
      messages: {
        Row: WithIndex<Message>
        Insert: WithIndex<MessageInsert>
        Update: WithIndex<MessageUpdate>
        Relationships: []
      }
      ai_responses: {
        Row: WithIndex<AiResponse>
        Insert: WithIndex<AiResponseInsert>
        Update: WithIndex<AiResponseUpdate>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
  }
}

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

export type MessageStatus = 'arrived' | 'in_progress' | 'replied' | 'archived'
export type KanbanStatus = Extract<MessageStatus, 'arrived' | 'in_progress' | 'replied'>
export type MessagePriority = 'high' | 'medium' | 'low'
export type MessageChannel = 'email' | 'whatsapp'
export type MessageSettore = 'Traffico' | 'Magazzino' | 'Amministrazione'
export type GradoUrgenza = 'bassa' | 'media' | 'alta' | 'critica'
export type TipoDocumento = 'CMR' | 'DDT' | 'Fattura' | 'Bolla' | 'Ordine'

export interface DatiEstratti {
  /** Numero/codice spedizione alfanumerico (es. "SPD-001", "12345ABC"). null se assente. */
  numero_spedizione: string | null
  /** Targa automezzo in formato italiano (es. "AB123CD"). null se assente. */
  targa_automezzo: string | null
  /** Tipo di documento logistico riconosciuto nel testo. null se assente. */
  tipo_documento: TipoDocumento | null
  /** Luoghi di partenza e/o destinazione menzionati. null se assenti. */
  punti_di_carico_scarico: { partenza: string | null; destinazione: string | null } | null
  /** Grado di urgenza dedotto dal tono e dalle parole chiave del messaggio. */
  grado_urgenza: GradoUrgenza
}

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
  assigned_to: string | null
  token_code: string | null
  notion_1: string | null
  notion_2: string | null
  notion_3: string | null
  settore: MessageSettore | null
  dati_estratti: DatiEstratti | null
  received_at: string
  created_at: string
}

// ─── Spedizioni ───────────────────────────────────────────────────────────────

export interface Spedizione {
  id: string
  numero: string                          // SP-2026-001
  stato: string                           // In transito | Consegnato | Ritardo | In attesa | Fermo
  posizione_attuale: string | null
  data_prevista_consegna: string | null   // ISO timestamp
  nome_autista: string | null
  targa: string | null
  mittente: string | null
  destinatario: string | null
  indirizzo_destinazione: string | null
  note: string | null
  created_at: string
}

export type SpedizioneInsert = Omit<Spedizione, 'id' | 'created_at'> & { id?: string }

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

export type MessageInsert = Omit<Message, 'id' | 'created_at' | 'priority' | 'channel' | 'token_code' | 'notion_1' | 'notion_2' | 'notion_3' | 'settore' | 'dati_estratti'> & {
  id?: string
  priority?: MessagePriority | null
  channel?: MessageChannel | null
  token_code?: string | null
  notion_1?: string | null
  notion_2?: string | null
  notion_3?: string | null
  settore?: MessageSettore | null
  dati_estratti?: DatiEstratti | null
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
      spedizioni: {
        Row: WithIndex<Spedizione>
        Insert: WithIndex<SpedizioneInsert>
        Update: WithIndex<Partial<SpedizioneInsert>>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
  }
}

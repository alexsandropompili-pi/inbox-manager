// lib/kb/wiki-manager.ts
import { createServiceClient } from '@/lib/supabase/service'
import type { KbWikiPage, KbWikiPageInsert } from '@/types/database'

export async function getAllWikiPages(companyId: string): Promise<KbWikiPage[]> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('kb_wiki_pages')
    .select('*')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getWikiPage(companyId: string, slug: string): Promise<KbWikiPage | null> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('kb_wiki_pages')
    .select('*')
    .eq('company_id', companyId)
    .eq('slug', slug)
    .single()
  if (error) { if (error.code === 'PGRST116') return null; throw error }
  return data
}

export async function getWikiIndex(companyId: string): Promise<string> {
  const page = await getWikiPage(companyId, 'index')
  return page?.content ?? ''
}

export async function upsertWikiPage(
  companyId: string,
  slug: string,
  data: Omit<KbWikiPageInsert, 'company_id' | 'slug'>
): Promise<KbWikiPage> {
  const db = createServiceClient()
  const existing = await getWikiPage(companyId, slug)
  if (existing) {
    const { data: updated, error } = await db
      .from('kb_wiki_pages')
      .update({ ...data, version: existing.version + 1 })
      .eq('id', existing.id)
      .select().single()
    if (error) throw error
    return updated
  } else {
    const { data: created, error } = await db
      .from('kb_wiki_pages')
      .insert({ company_id: companyId, slug, ...data })
      .select().single()
    if (error) throw error
    return created
  }
}

export async function getWikiPagesBySlug(
  companyId: string,
  slugs: string[]
): Promise<KbWikiPage[]> {
  if (!slugs.length) return []
  const db = createServiceClient()
  const { data, error } = await db
    .from('kb_wiki_pages')
    .select('*')
    .eq('company_id', companyId)
    .in('slug', slugs)
  if (error) throw error
  return data
}

export async function appendWikiLog(
  companyId: string,
  action: string,
  detail: string,
  sourceId?: string,
  pageSlug?: string
) {
  const db = createServiceClient()
  await db.from('kb_wiki_log').insert({
    company_id: companyId,
    action,
    detail,
    source_id: sourceId ?? null,
    page_slug: pageSlug ?? null,
  })
}
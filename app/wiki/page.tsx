import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/app/components/layout/AppShell'
import { getSourcesAction, getWikiPagesAction } from '@/app/actions/wiki'
import { WikiClient } from './WikiClient'

export default async function WikiPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [sources, pages] = await Promise.all([getSourcesAction(), getWikiPagesAction()])

  return (
    <AppShell userEmail={user.email ?? ''}>
      <WikiClient initialSources={sources} initialPages={pages} />
    </AppShell>
  )
}

// app/api/kb/pages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAllWikiPages } from '@/lib/kb/wiki-manager'

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId)
    return NextResponse.json({ error: 'company_id obbligatorio' }, { status: 400 })
  const pages = await getAllWikiPages(companyId)
  return NextResponse.json({ pages })
}
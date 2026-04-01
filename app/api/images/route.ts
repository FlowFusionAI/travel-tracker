import { NextRequest, NextResponse } from 'next/server'
import { getRecord } from '@/lib/airtable'
import type { AirtableAttachment, TableName } from '@/lib/types/airtable'

const VALID_TABLES: readonly TableName[] = [
  'Trips',
  'Countries',
  'Cities',
  'Mind Map Nodes',
  'Node Connections',
  'Memories',
  'Users',
]

/**
 * GET /api/images?recordId=recXXX&table=Trips&field=Cover+Image&index=0
 *
 * Fetches the Airtable record fresh (getting a new signed URL), then
 * 302-redirects to it. Cache-Control: no-store prevents the browser or
 * any CDN from caching the redirect — a fresh URL is fetched every time.
 *
 * Components must always use this proxy as their image src, never the raw
 * Airtable CDN URL (which expires in ~2 hours).
 *
 * Parameters:
 *   recordId  — Airtable record ID (starts with "rec")
 *   table     — one of the valid TableName values
 *   field     — exact Airtable field name, e.g. "Cover Image", "Images", "Photos"
 *   index     — (optional, default 0) which attachment in the array to return
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const recordId = searchParams.get('recordId')
  const table = searchParams.get('table') as TableName | null
  const field = searchParams.get('field')
  const indexParam = searchParams.get('index')
  const indexRaw = indexParam !== null ? parseInt(indexParam, 10) : 0
  const index = Number.isNaN(indexRaw) ? 0 : indexRaw

  if (!recordId || !table || !field) {
    return NextResponse.json(
      { error: 'recordId, table, and field are required query params' },
      { status: 400 }
    )
  }

  if (!(VALID_TABLES as readonly string[]).includes(table)) {
    return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 })
  }

  try {
    const record = await getRecord(table, recordId)
    const attachments = record[field] as AirtableAttachment[] | undefined

    if (!attachments || attachments.length === 0) {
      return NextResponse.json(
        { error: `No attachments found in field "${field}" on record ${recordId}` },
        { status: 404 }
      )
    }

    const attachment = attachments[index] ?? attachments[0]

    // Validate the URL is a real Airtable CDN URL before redirecting.
    // Airtable attachment URLs are always https and hosted on airtableusercontent.com.
    const { protocol, hostname } = new URL(attachment.url)
    if (protocol !== 'https:' || !hostname.endsWith('airtableusercontent.com')) {
      return NextResponse.json({ error: 'Attachment URL is not a valid Airtable CDN URL' }, { status: 502 })
    }

    const response = NextResponse.redirect(attachment.url)
    // Must not cache: the Location URL expires in ~2h.
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

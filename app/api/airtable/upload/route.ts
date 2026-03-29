// app/api/airtable/upload/route.ts
// POST /api/airtable/upload?recordId=recXXX&field=Cover+Image
//
// Accepts multipart/form-data with a single "file" entry.
// Uploads to Airtable via the Content Upload API:
//   POST https://content.airtable.com/v0/{baseId}/{recordId}/{fieldId}/uploadAttachment
//
// Only the "Cover Image" field is supported for now.
// Returns { success: true } or { error: string }.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

// Map of human-readable field names → Airtable field IDs (from Trips table)
const SUPPORTED_FIELDS: Record<string, string> = {
  'Cover Image': 'fldLdoM3BVe0PUair',
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const recordId = searchParams.get('recordId')
  const fieldName = searchParams.get('field')

  if (!recordId || !fieldName) {
    return NextResponse.json(
      { error: 'recordId and field query params are required' },
      { status: 400 }
    )
  }

  const fieldId = SUPPORTED_FIELDS[fieldName]
  if (!fieldId) {
    return NextResponse.json(
      { error: `Upload not supported for field: ${fieldName}` },
      { status: 400 }
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'file is required in form data' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const baseId = process.env.AIRTABLE_BASE_ID
  const apiKey = process.env.AIRTABLE_API_KEY

  if (!baseId || !apiKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const uploadUrl = `https://content.airtable.com/v0/${baseId}/${recordId}/${fieldId}/uploadAttachment`

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': file.type || 'image/jpeg',
      'X-Airtable-Client-Secret': apiKey,
    },
    body: buffer,
  })

  if (!uploadRes.ok) {
    const errText = await uploadRes.text()
    console.error('Airtable upload error:', uploadRes.status, errText)
    return NextResponse.json(
      { error: `Airtable upload failed (${uploadRes.status})` },
      { status: 502 }
    )
  }

  return NextResponse.json({ success: true })
}

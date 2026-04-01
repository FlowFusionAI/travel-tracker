import { NextRequest, NextResponse } from 'next/server'
import {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
} from '@/lib/airtable'
import type { TableName } from '@/lib/types/airtable'

const VALID_TABLES: readonly TableName[] = [
  'Trips',
  'Countries',
  'Cities',
  'Mind Map Nodes',
  'Node Connections',
  'Memories',
  'Users',
]

function isValidTable(name: string): name is TableName {
  return (VALID_TABLES as readonly string[]).includes(name)
}

// In Next.js 15+, route segment params are a Promise.
type RouteParams = { params: Promise<{ table: string }> }

// GET /api/airtable/[table]
//   ?id=recXXX                  → fetch single record
//   ?filterByFormula=...         → fetch all matching records (Airtable formula syntax)
//   (no params)                  → fetch all records in table
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { table } = await params
  if (!isValidTable(table)) {
    return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const record = await getRecord(table, id)
      return NextResponse.json(record)
    }

    const filterByFormula = searchParams.get('filterByFormula') ?? undefined
    const records = await listRecords(table, filterByFormula)
    return NextResponse.json(records)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/airtable/[table]
//   body: { ...fields }          → creates a new record, returns it with its ID
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { table } = await params
  if (!isValidTable(table)) {
    return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 })
  }

  try {
    const fields = await req.json()
    const record = await createRecord(table, fields)
    return NextResponse.json(record, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error(`[POST /api/airtable/${table}]`, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/airtable/[table]
//   body: { id: "recXXX", ...fields }   → updates named fields, returns updated record
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { table } = await params
  if (!isValidTable(table)) {
    return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { id, ...fields } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Request body must include "id" (string)' },
        { status: 400 }
      )
    }
    const record = await updateRecord(table, id, fields)
    return NextResponse.json(record)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error(`[PATCH /api/airtable/${table}]`, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/airtable/[table]?id=recXXX
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { table } = await params
  if (!isValidTable(table)) {
    return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'Query param "id" is required' },
        { status: 400 }
      )
    }
    const result = await deleteRecord(table, id)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

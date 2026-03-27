import Airtable from 'airtable'
import PQueue from 'p-queue'
import type { TableName } from './types/airtable'

if (!process.env.AIRTABLE_API_KEY) {
  throw new Error('AIRTABLE_API_KEY is not set in .env.local')
}
if (!process.env.AIRTABLE_BASE_ID) {
  throw new Error('AIRTABLE_BASE_ID is not set in .env.local')
}

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
)

// 5 requests per second — Airtable's documented rate limit
const queue = new PQueue({ intervalCap: 5, interval: 1000 })

// Convert an Airtable SDK record object to a plain serialisable object.
// The SDK returns class instances; JSON.stringify won't include methods.
function serialise(record: {
  id: string
  fields: Record<string, unknown>
}): Record<string, unknown> {
  return { id: record.id, ...record.fields }
}

/**
 * Fetch all records from a table, optionally filtered.
 * filterByFormula follows Airtable formula syntax, e.g.
 *   AND({Status}="Completed", {User}="recXXXXXXXXXXXXXX")
 */
export async function listRecords(
  tableName: TableName,
  filterByFormula?: string
): Promise<Record<string, unknown>[]> {
  const records = await queue.add(
    () => base(tableName).select({ ...(filterByFormula ? { filterByFormula } : {}) }).all(),
    { throwOnTimeout: true }
  )
  return records.map(serialise)
}

/**
 * Fetch a single record by its Airtable record ID (starts with "rec").
 */
export async function getRecord(
  tableName: TableName,
  recordId: string
): Promise<Record<string, unknown>> {
  const record = await queue.add(
    () => base(tableName).find(recordId),
    { throwOnTimeout: true }
  )
  return serialise(record as { id: string; fields: Record<string, unknown> })
}

/**
 * Create a new record. Returns the created record with its generated ID.
 */
export async function createRecord(
  tableName: TableName,
  fields: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const record = await queue.add(
    () => base(tableName).create(fields as Airtable.FieldSet),
    { throwOnTimeout: true }
  )
  return serialise(record as { id: string; fields: Record<string, unknown> })
}

/**
 * Update fields on an existing record. Uses Airtable's PATCH semantics:
 * only the supplied fields are changed; others are left as-is.
 */
export async function updateRecord(
  tableName: TableName,
  recordId: string,
  fields: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const record = await queue.add(
    () => base(tableName).update(recordId, fields as Airtable.FieldSet),
    { throwOnTimeout: true }
  )
  return serialise(record as { id: string; fields: Record<string, unknown> })
}

/**
 * Delete a record permanently. Returns { id, deleted: true }.
 */
export async function deleteRecord(
  tableName: TableName,
  recordId: string
): Promise<{ id: string; deleted: true }> {
  const deleted = await queue.add(
    () => base(tableName).destroy(recordId),
    { throwOnTimeout: true }
  )
  return { id: deleted?.id ?? recordId, deleted: true }
}

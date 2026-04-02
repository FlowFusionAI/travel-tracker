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
 * Extract and log full error details from an Airtable SDK error.
 * Airtable SDK errors carry statusCode, error (type code), and message
 * alongside the standard Error properties.
 */
function logAirtableError(
  op: string,
  table: TableName,
  err: unknown,
  ctx?: Record<string, unknown>
): void {
  const details: Record<string, unknown> = { op, table, ...ctx }
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    if ('statusCode' in e) details.statusCode = e.statusCode
    if ('error' in e) details.airtableError = e.error
    if ('message' in e) details.message = e.message
  }
  console.error('[airtable]', JSON.stringify(details), err)
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
  try {
    const records = await queue.add(
      () => base(tableName).select({ ...(filterByFormula ? { filterByFormula } : {}) }).all(),
      { throwOnTimeout: true }
    )
    return records.map(serialise)
  } catch (err) {
    logAirtableError('listRecords', tableName, err, { filterByFormula })
    throw err
  }
}

/**
 * Fetch a single record by its Airtable record ID (starts with "rec").
 */
export async function getRecord(
  tableName: TableName,
  recordId: string
): Promise<Record<string, unknown>> {
  try {
    const record = await queue.add(
      () => base(tableName).find(recordId),
      { throwOnTimeout: true }
    )
    return serialise(record as { id: string; fields: Record<string, unknown> })
  } catch (err) {
    logAirtableError('getRecord', tableName, err, { recordId })
    throw err
  }
}

/**
 * Create a new record. Returns the created record with its generated ID.
 */
export async function createRecord(
  tableName: TableName,
  fields: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const record = await queue.add(
      () => base(tableName).create(fields as Airtable.FieldSet),
      { throwOnTimeout: true }
    )
    return serialise(record as { id: string; fields: Record<string, unknown> })
  } catch (err) {
    logAirtableError('createRecord', tableName, err, { fieldKeys: Object.keys(fields) })
    throw err
  }
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
  try {
    const record = await queue.add(
      () => base(tableName).update(recordId, fields as Airtable.FieldSet),
      { throwOnTimeout: true }
    )
    return serialise(record as { id: string; fields: Record<string, unknown> })
  } catch (err) {
    logAirtableError('updateRecord', tableName, err, { recordId, fieldKeys: Object.keys(fields) })
    throw err
  }
}

/**
 * Delete a record permanently. Returns { id, deleted: true }.
 */
export async function deleteRecord(
  tableName: TableName,
  recordId: string
): Promise<{ id: string; deleted: true }> {
  try {
    const deleted = await queue.add(
      () => base(tableName).destroy(recordId),
      { throwOnTimeout: true }
    )
    return { id: deleted?.id ?? recordId, deleted: true }
  } catch (err) {
    logAirtableError('deleteRecord', tableName, err, { recordId })
    throw err
  }
}

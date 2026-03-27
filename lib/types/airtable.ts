/**
 * Type definitions for all Airtable tables.
 *
 * Field names match Airtable exactly (including spaces and capitalisation)
 * so these types can be used directly with the SDK's raw FieldSet.
 *
 * IMPORTANT: AirtableAttachment.url is a signed URL that expires in ~2 hours.
 * Never render it directly in a component. Always go via /api/images.
 */

export interface AirtableAttachment {
  id: string
  url: string          // expires — use /api/images proxy, not this directly
  filename: string
  size: number
  type: string
  width?: number
  height?: number
  thumbnails?: {
    small?: { url: string; width: number; height: number }
    large?: { url: string; width: number; height: number }
  }
}

// Union of all valid table names. Must match Airtable base exactly.
export type TableName =
  | 'Trips'
  | 'Countries'
  | 'Cities'
  | 'MindMapNodes'
  | 'NodeConnections'
  | 'Memories'
  | 'Users'

// ─── Enum-like types ─────────────────────────────────────────────────────────

export type TripStatus = 'Completed' | 'Planned' | 'Wishlist' | 'In Progress'
export type TripType = 'Solo' | 'Group' | 'Couple' | 'Family' | 'Work'
export type TripCategory =
  | 'Culture'
  | 'Adventure'
  | 'Food'
  | 'Relaxation'
  | 'Festival'
  | 'City Break'
export type Continent =
  | 'Europe'
  | 'Asia'
  | 'Africa'
  | 'North America'
  | 'South America'
  | 'Oceania'
  | 'Antarctica'
export type NodeType =
  | 'Activity'
  | 'Place'
  | 'Food'
  | 'Transport'
  | 'Accommodation'
  | 'Note'
  | 'Day Header'
  | 'Thought'
export type EdgeStyle = 'Solid' | 'Dashed' | 'Dotted'
export type MemoryTag = 'Food' | 'Funny' | 'Scenic' | 'People' | 'Mishap' | 'Highlight'

// ─── Table field shapes ───────────────────────────────────────────────────────
// These describe the raw fields returned by the Airtable SDK.
// Optional fields may be absent if not set in Airtable.

export interface TripFields {
  Name: string
  Country?: string[]
  Cities?: string[]
  'Start Date'?: string
  'End Date'?: string
  'Trip Type'?: TripType
  Category?: TripCategory[]
  Status: TripStatus
  'Cover Image'?: AirtableAttachment[]
  Summary?: string
  Rating?: number
  'Budget Spent'?: number
  Nodes?: string[]
  Memories?: string[]
  User?: string[]
}

export interface CountryFields {
  Name: string
  'ISO Code': string
  Continent?: Continent
  'Flag Emoji'?: string
  'Times Visited': number
  'First Visited'?: string
  Trips?: string[]
  Cities?: string[]
}

export interface CityFields {
  Name: string
  Country?: string[]
  Latitude?: number
  Longitude?: number
  'Times Visited': number
  Trips?: string[]
  Rating?: number
  Notes?: string
  Memories?: string[]
}

export interface MindMapNodeFields {
  Title: string
  Content?: string
  Trip?: string[]
  'Node Type'?: NodeType
  'Position X'?: number
  'Position Y'?: number
  Width?: number
  Height?: number
  Colour?: string
  Images?: AirtableAttachment[]
  Links?: string       // JSON: Array<{ url: string; label: string }>
  'Day Number'?: number
  Time?: string
  Checklist?: string   // JSON: Array<{ text: string; checked: boolean }>
  'Connections Out'?: string[]
  'Connections In'?: string[]
  User?: string[]
}

export interface NodeConnectionFields {
  'Source Node'?: string[]
  'Target Node'?: string[]
  Trip?: string[]
  Label?: string
  Style?: EdgeStyle
  Colour?: string
}

export interface MemoryFields {
  Text?: string
  Photos?: AirtableAttachment[]
  Trip?: string[]
  City?: string[]
  Date?: string
  Tags?: MemoryTag[]
  User?: string[]
}

export interface UserFields {
  Name?: string
  Email?: string
  'Password Hash'?: string
  Trips?: string[]
}

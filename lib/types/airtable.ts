/**
 * Type definitions for all Airtable tables.
 *
 * Field names match Airtable exactly (including spaces and capitalisation).
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
  | 'Mind Map Nodes'
  | 'Node Connections'
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

// Matches actual Airtable singleSelect choice values (lowercase, hyphenated)
export type NodeType =
  | 'activity'
  | 'place'
  | 'food'
  | 'transport'
  | 'accommodation'
  | 'note'
  | 'day-header'
  | 'thought'

export type EdgeStyle = 'Solid' | 'Dashed' | 'Dotted'
export type MemoryTag = 'Food' | 'Funny' | 'Scenic' | 'People' | 'Mishap' | 'Highlight'

// ─── Table field shapes ───────────────────────────────────────────────────────

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
  summary?: string
  Rating?: number
  'Budget Spent'?: number
  'Mind Map Nodes'?: string[]
  'Node Connections'?: string[]
  Memories?: string[]
  User?: string[]
}

export interface CountryFields {
  name: string
  'ISO code': string
  continent?: Continent
  'Flag Emoji'?: string
  'Times Visited': number
  'First Visited'?: string
  Trips?: string[]
  Cities?: string[]
}

export interface CityFields {
  name: string
  country?: string[]
  'coordinates (lat)'?: number
  'coordinates (lng)'?: number
  'Times Visited': number
  'linked trips'?: string[]
  rating?: number
  Notes?: string
  Memories?: string[]
}

// Field names match Airtable Mind Map Nodes table exactly
export interface MindMapNodeFields {
  title: string
  content?: string
  trip?: string[]
  'node type'?: NodeType
  'position X'?: number
  'position Y'?: number
  Width?: number
  Height?: number
  'colour/category'?: string
  images?: AirtableAttachment[]
  links?: string             // JSON: Array<{ url: string; label: string }>
  'Day Number'?: number
  Time?: string
  Checklist?: string         // JSON: Array<{ text: string; checked: boolean }>
  'Node Connections (source node)'?: string[]
  'Node Connections (target node)'?: string[]
  User?: string[]
}

// Field names match Airtable Node Connections table exactly
export interface NodeConnectionFields {
  label?: string
  'source node'?: string[]
  'target node'?: string[]
  trip?: string[]
  Style?: EdgeStyle
  Colour?: string
}

export interface MemoryFields {
  text?: string
  photos?: AirtableAttachment[]
  trip?: string[]
  city?: string[]
  date?: string
  tags?: MemoryTag[]
  User?: string[]
}

export interface UserFields {
  Name?: string
  Email?: string
  'Password Hash'?: string
  Trips?: string[]
}

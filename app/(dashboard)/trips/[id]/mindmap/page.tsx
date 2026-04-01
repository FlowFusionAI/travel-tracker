// app/(dashboard)/trips/[id]/mindmap/page.tsx
import { listRecords } from '@/lib/airtable'
import { airtableRecordToNode, airtableRecordToEdge } from '@/lib/mindmap/transforms'
import MindMapCanvas from '@/components/mindmap/MindMapCanvas'

type PageParams = { params: Promise<{ id: string }> }

export default async function MindMapPage({ params }: PageParams) {
  const { id: tripId } = await params

  // Fetch nodes and connections for this trip in parallel
  // Ownership already verified by [id]/layout.tsx
  const [rawNodes, rawEdges] = await Promise.all([
    listRecords('Mind Map Nodes', `FIND("${tripId}", ARRAYJOIN({trip})) > 0`),
    listRecords('Node Connections', `FIND("${tripId}", ARRAYJOIN({trip})) > 0`),
  ])

  const initialNodes = rawNodes.map(airtableRecordToNode)
  const initialEdges = rawEdges.map(airtableRecordToEdge)

  return (
    <div className="h-full w-full">
      <MindMapCanvas
        tripId={tripId}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
      />
    </div>
  )
}

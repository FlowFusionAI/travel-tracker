// components/mindmap/nodes/index.ts
import type { NodeTypes } from '@xyflow/react'
import ActivityNode from './ActivityNode'
import PlaceNode from './PlaceNode'
import FoodNode from './FoodNode'
import TransportNode from './TransportNode'
import AccommodationNode from './AccommodationNode'
import NoteNode from './NoteNode'
import DayHeaderNode from './DayHeaderNode'
import ThoughtNode from './ThoughtNode'

export const nodeTypes: NodeTypes = {
  activity: ActivityNode,
  place: PlaceNode,
  food: FoodNode,
  transport: TransportNode,
  accommodation: AccommodationNode,
  note: NoteNode,
  'day-header': DayHeaderNode,
  thought: ThoughtNode,
}

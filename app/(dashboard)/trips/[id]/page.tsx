import { redirect } from 'next/navigation'

type PageParams = { params: Promise<{ id: string }> }

export default async function TripPage({ params }: PageParams) {
  const { id } = await params
  redirect(`/trips/${id}/mindmap`)
}

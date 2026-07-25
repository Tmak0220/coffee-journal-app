import EditContentPageClient from "./EditContentPageClient"

export default function EditContentPage({
  params,
}: {
  params: Promise<{ lang: string; type: string; id: string }>
}) {
  return <EditContentPageClient params={params} />
}

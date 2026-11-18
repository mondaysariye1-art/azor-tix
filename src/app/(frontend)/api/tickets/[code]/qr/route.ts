import QRCode from 'qrcode'
import { getPayloadClient } from '@/lib/payload'

export async function GET(_request: Request, { params }: RouteContext<'/api/tickets/[code]/qr'>) {
  const { code } = await params
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'tickets',
    overrideAccess: true,
    where: { code: { equals: code } },
    limit: 1,
    depth: 0,
  })
  if (!result.docs[0]) return new Response('Not found', { status: 404 })
  const svg = await QRCode.toString(code, {
    type: 'svg',
    margin: 2,
    color: { dark: '#0a0a0a', light: '#f5f0e7' },
  })
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, no-store' },
  })
}

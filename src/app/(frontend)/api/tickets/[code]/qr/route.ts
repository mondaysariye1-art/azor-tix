import { getPayloadClient } from '@/lib/payload'
import {
  generateTicketQrPngBuffer,
  generateTicketQrSvg,
  resolveTicketForCustomerView,
} from '@/lib/tickets'

export async function GET(request: Request, { params }: RouteContext<'/api/tickets/[code]/qr'>) {
  const { code } = await params
  const url = new URL(request.url)
  const format = url.searchParams.get('format')

  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ||
    (request.url.startsWith('https://') ? 'https' : 'http')
  const baseUrl = host ? `${proto}://${host}` : undefined

  const payload = await getPayloadClient()
  const ticket = await resolveTicketForCustomerView(payload, code, baseUrl)
  if (!ticket) return new Response('Not found', { status: 404 })

  if (format === 'png') {
    const png = await generateTicketQrPngBuffer(ticket.verificationUrl)
    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(png.length),
        'Cache-Control': 'private, max-age=300',
      },
    })
  }

  const svg = await generateTicketQrSvg(ticket.verificationUrl)
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'private, no-store',
    },
  })
}

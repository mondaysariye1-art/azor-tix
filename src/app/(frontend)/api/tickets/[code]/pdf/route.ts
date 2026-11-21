import { getPayloadClient } from '@/lib/payload'
import { generateTicketPdfBuffer, resolveTicketForCustomerView } from '@/lib/tickets'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ||
    (request.url.startsWith('https://') ? 'https' : 'http')
  const baseUrl = host ? `${proto}://${host}` : undefined

  const payload = await getPayloadClient()
  const ticket = await resolveTicketForCustomerView(payload, code, baseUrl)
  if (!ticket) {
    return new Response('Ticket not found', { status: 404 })
  }

  const pdfBuffer = await generateTicketPdfBuffer(ticket)
  const safeCode = ticket.code.replace(/[^A-Za-z0-9-_]/g, '')

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="AZORTIX-${safeCode}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'private, no-store',
    },
  })
}

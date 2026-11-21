import 'server-only'
import type { Payload } from 'payload'

export type EmailAttachment = {
  filename: string
  content: Buffer | string
  contentType?: string
  cid?: string
  content_id?: string
}

export type EmailDeliveryResult = {
  sent: boolean
  configured: boolean
  reason?: string
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.AZOR_EMAIL_FROM)
}

export function missingEmailEnvVars(): string[] {
  const missing: string[] = []
  if (!process.env.RESEND_API_KEY) missing.push('RESEND_API_KEY')
  if (!process.env.AZOR_EMAIL_FROM) missing.push('AZOR_EMAIL_FROM')
  return missing
}

export function wrapEmailHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f5f0e7; color:#0a0a0a; padding:24px;">
    <div style="max-width:580px; margin:0 auto; background:#fcfaf6; border:1px solid #d9d3c8; padding:32px;">
      <div style="font-size:12px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:#0a0a0a; margin-bottom:16px;">AZORTIX · ABUJA</div>
      <h1 style="font-size:24px; margin:0 0 16px; color:#0a0a0a;">${title}</h1>
      <div style="font-size:14px; line-height:1.65; color:#2b2a2f;">${bodyHtml}</div>
      <hr style="border:0; border-top:1px solid #e5dfd5; margin:24px 0;" />
      <p style="font-size:12px; color:#6f6b76; margin:0;">AZORTIX Ticketing Platform · Abuja, Nigeria</p>
    </div>
  </body>
</html>`
}

export async function sendTransactionalEmail(params: {
  payload: Payload
  to: string | string[]
  subject: string
  title: string
  bodyHtml: string
  text: string
  rawHtml?: boolean
  attachments?: EmailAttachment[]
}): Promise<EmailDeliveryResult> {
  if (!isEmailConfigured()) {
    const missing = missingEmailEnvVars().join(', ')
    return {
      sent: false,
      configured: false,
      reason: `Transactional email not sent because ${missing} is not configured.`,
    }
  }

  try {
    await (params.payload.sendEmail as any)({
      to: params.to,
      subject: params.subject,
      html: params.rawHtml ? params.bodyHtml : wrapEmailHtml(params.title, params.bodyHtml),
      text: params.text,
      ...(params.attachments?.length ? { attachments: params.attachments } : {}),
    })
    return { sent: true, configured: true }
  } catch (error) {
    return {
      sent: false,
      configured: true,
      reason: error instanceof Error ? error.message : 'Email delivery failed.',
    }
  }
}

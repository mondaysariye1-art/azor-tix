import 'server-only'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import QRCode from 'qrcode'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { Payload } from 'payload'
import { sendTransactionalEmail, type EmailAttachment, type EmailDeliveryResult } from '@/lib/email'
import { getPgPool, withTransactionLocked } from '@/lib/postgres'

const TICKET_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const DEFAULT_VERIFY_ORIGIN = 'https://azortix.org'
const SUPPORT_EMAIL = 'tickets@azortix.org'

export type TicketAcquisitionType =
  | 'self-purchase'
  | 'gift'
  | 'private-invitation'
  | 'public-free'
  | 'complimentary'

export type TicketValidationStatus =
  | 'VALID_TICKET'
  | 'ALREADY_USED'
  | 'INVALID_TICKET'
  | 'CANCELLED_TICKET'
  | 'REFUNDED_TICKET'
  | 'WRONG_EVENT'
  | 'EVENT_NOT_OPEN'

export interface CheckInTicketSummary {
  id: string
  code: string
  attendeeName: string
  attendeeEmail?: string
  ticketTypeName: string
  acquisitionType: TicketAcquisitionType
  peopleCovered: number
  purchaserName?: string | null
  eventId: string
  eventName: string
  orderReference: string
  source: string
  status: string
  checkedInAt?: string | null
  checkedInByName?: string | null
}

export interface CheckInValidationResponse {
  ok: boolean
  code: TicketValidationStatus
  headline: string
  message: string
  httpStatus: number
  ticket?: CheckInTicketSummary
}

export interface EventAttendanceStats {
  eventId: string
  eventTitle: string
  eventDate: string
  eventTime: string
  eventVenue: string
  checkInStatus: 'open' | 'closed'
  totalTicketsIssued: number
  paidTickets: number
  giftTickets: number
  privateInvitationTickets: number
  publicFreeTickets: number
  expectedAttendees: number
  checkedInTickets: number
  checkedInAttendees: number
  remainingTickets: number
  remainingAttendees: number
  cancelledTickets: number
  refundedTickets: number
  checkInPercent: number
  recentCheckIns: Array<{
    id: string
    code: string
    attendeeName: string
    ticketTypeName: string
    acquisitionType: string
    peopleCovered: number
    checkedInAt: string
    checkedInByName: string
  }>
}

export interface TicketDisplayRecord {
  id: string
  code: string
  token: string
  verificationUrl: string
  sharePath: string
  shareUrl: string
  qrImagePath: string
  pdfDownloadPath: string
  attendeeName: string
  attendeeEmail: string
  ticketTypeName: string
  eventName: string
  eventDate: string
  eventTime: string
  eventVenue: string
  orderReference: string
  peopleCovered: number
  isFree: boolean
  acquisitionType: TicketAcquisitionType
  purchaserName?: string | null
  purchaserEmail?: string | null
  giftMessage?: string | null
  source: string
  status: string
  checkedInAt?: string | null
  emailDeliveryStatus?: string | null
  emailLastError?: string | null
  emailAttempts?: number
}

export function getTicketEnvironmentStatus(): {
  ticketVerifyBaseUrlConfigured: boolean
  ticketTokenSecretConfigured: boolean
  usingStrongSecret: boolean
  effectiveBaseUrlIsPublic: boolean
} {
  const rawBase = (process.env.TICKET_VERIFY_BASE_URL || '').trim()
  const rawSecret = (process.env.TICKET_TOKEN_SECRET || '').trim()
  const effectiveBase = getTicketBaseUrl()
  return {
    ticketVerifyBaseUrlConfigured: Boolean(rawBase),
    ticketTokenSecretConfigured: Boolean(rawSecret),
    usingStrongSecret: rawSecret.length >= 32,
    effectiveBaseUrlIsPublic: !/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(
      effectiveBase,
    ),
  }
}

function deriveKeyFromSecret(secret: string): Buffer {
  return crypto.createHash('sha256').update(`azor-ticket-key:${secret}`).digest()
}

function getPrimaryTokenSecret(): string {
  const explicit = (process.env.TICKET_TOKEN_SECRET || '').trim()
  if (explicit) {
    if (process.env.NODE_ENV === 'production' && explicit.length < 32) {
      throw new Error(
        'TICKET_TOKEN_SECRET must be at least 32 characters in production for cryptographic ticket security.',
      )
    }
    return explicit
  }
  const payloadSecret = (process.env.PAYLOAD_SECRET || '').trim()
  if (payloadSecret) return payloadSecret
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'TICKET_TOKEN_SECRET is required in production. Configure a 32+ byte random secret.',
    )
  }
  return 'azor-tix-local-dev-secret'
}

function getTokenEncryptionKey(): Buffer {
  return deriveKeyFromSecret(getPrimaryTokenSecret())
}

function getLegacyDecryptionKeys(): Buffer[] {
  const candidates = [
    (process.env.TICKET_TOKEN_SECRET || '').trim(),
    (process.env.PAYLOAD_SECRET || '').trim(),
    process.env.NODE_ENV !== 'production' ? 'azor-tix-local-dev-secret' : '',
  ].filter(Boolean)
  const unique = Array.from(new Set(candidates))
  return unique.map(deriveKeyFromSecret)
}

export function generateTicketCode(): string {
  const bytes = crypto.randomBytes(8)
  let partA = ''
  let partB = ''
  for (let i = 0; i < 4; i++) {
    partA += TICKET_CODE_ALPHABET[bytes[i] % TICKET_CODE_ALPHABET.length]
    partB += TICKET_CODE_ALPHABET[bytes[i + 4] % TICKET_CODE_ALPHABET.length]
  }
  return `AZT-${partA}-${partB}`
}

export function generateSecureVerificationToken(): string {
  return crypto.randomBytes(24).toString('base64url')
}

export function hashVerificationToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex')
}

export function encryptVerificationToken(rawToken: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getTokenEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(rawToken, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`
}

export function decryptVerificationToken(ciphertext: string | null | undefined): string | null {
  if (!ciphertext || typeof ciphertext !== 'string') return null
  const parts = ciphertext.split('.')
  if (parts.length !== 3) return null
  const iv = Buffer.from(parts[0], 'base64url')
  const authTag = Buffer.from(parts[1], 'base64url')
  const encrypted = Buffer.from(parts[2], 'base64url')

  for (const key of getLegacyDecryptionKeys()) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(authTag)
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
      return decrypted.toString('utf8')
    } catch {
      // Try next compatible key during TICKET_TOKEN_SECRET rotation
    }
  }
  return null
}

function isLocalhostUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(url.trim())
}

export function getTicketBaseUrl(overrideOrigin?: string): string {
  const configured = (process.env.TICKET_VERIFY_BASE_URL || '').trim().replace(/\/+$/, '')
  if (configured && !isLocalhostUrl(configured)) {
    return configured
  }

  const candidates = [
    overrideOrigin,
    process.env.FIGMA_PUBLIC_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    DEFAULT_VERIFY_ORIGIN,
  ]

  for (const candidate of candidates) {
    const cleaned = String(candidate || '')
      .trim()
      .replace(/\/+$/, '')
    if (cleaned && !isLocalhostUrl(cleaned)) {
      return cleaned
    }
  }

  const fallback = String(overrideOrigin || process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_VERIFY_ORIGIN)
    .trim()
    .replace(/\/+$/, '')
  return fallback || DEFAULT_VERIFY_ORIGIN
}

export function buildVerificationUrl(rawToken: string, baseUrl?: string): string {
  const origin = process.env.TICKET_VERIFY_BASE_URL
    ? process.env.TICKET_VERIFY_BASE_URL.trim().replace(/\/+$/, '')
    : getTicketBaseUrl(baseUrl)
  return `${origin}/verify-ticket/${encodeURIComponent(rawToken)}`
}

export function buildTicketShareUrl(rawToken: string, baseUrl?: string): string {
  const origin = getTicketBaseUrl(baseUrl)
  return `${origin}/tickets/${encodeURIComponent(rawToken)}`
}

export function extractTicketCredential(rawInput: string): string {
  const cleaned = String(rawInput || '').trim()
  if (!cleaned) return ''

  const urlMatch = cleaned.match(/\/(?:verify-ticket|tickets)\/([^/?#\s]+)/i)
  if (urlMatch?.[1]) {
    try {
      return decodeURIComponent(urlMatch[1]).trim()
    } catch {
      return urlMatch[1].trim()
    }
  }

  return cleaned
}

export function formatEventDateTime(event: any): {
  eventName: string
  eventDate: string
  eventTime: string
  eventVenue: string
} {
  const eventName = String(event?.title || 'AZORTIX Event')
  const rawStart = event?.startsAt ? new Date(event.startsAt) : null
  const validStart = rawStart && Number.isFinite(rawStart.valueOf()) ? rawStart : null

  const eventDate = validStart
    ? new Intl.DateTimeFormat('en-NG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Africa/Lagos',
      }).format(validStart)
    : 'Date to be announced'

  const eventTime = validStart
    ? `${new Intl.DateTimeFormat('en-NG', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Africa/Lagos',
      }).format(validStart)} WAT`
    : 'Time to be announced'

  const venueParts = [
    event?.venue ? String(event.venue).trim() : '',
    event?.address ? String(event.address).trim() : '',
    event?.city ? String(event.city).trim() : 'Abuja',
  ].filter(Boolean)
  const dedupedVenue = venueParts.filter(
    (part, idx, arr) =>
      arr.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === idx,
  )
  const eventVenue =
    event?.eventFormat === 'virtual'
      ? 'Online Event'
      : dedupedVenue.join(', ') || 'Abuja, Nigeria'

  return { eventName, eventDate, eventTime, eventVenue }
}

export function computeOrderPeopleCovered(order: any, issuedTicketCount?: number): number {
  const items = Array.isArray(order?.items) ? order.items : []
  const sum = items.reduce((acc: number, item: any) => {
    const qty = Number(item?.quantity || 0)
    return acc + (Number.isFinite(qty) && qty > 0 ? qty : 0)
  }, 0)
  if (sum > 0) return sum
  return Math.max(1, Number(issuedTicketCount || 1))
}

export function isFreeOrderOrTicket(order: any, ticket?: any): boolean {
  if (ticket?.acquisitionType === 'private-invitation' || ticket?.acquisitionType === 'public-free') {
    return true
  }
  if (order) {
    if (order.orderKind === 'free' || order.orderKind === 'complimentary') return true
    if (Number(order.total ?? 0) === 0 && Number(order.subtotal ?? 0) === 0) return true
  }
  if (ticket) {
    return ['free-registration', 'free-claim', 'complimentary', 'guest-list'].includes(
      String(ticket.source || ''),
    )
  }
  return false
}

function normalizeAcquisitionType(ticket: any): TicketAcquisitionType {
  const raw = String(ticket?.acquisitionType || ticket?.acquisition_type || '').trim()
  if (
    raw === 'self-purchase' ||
    raw === 'gift' ||
    raw === 'private-invitation' ||
    raw === 'public-free' ||
    raw === 'complimentary'
  ) {
    return raw
  }
  const source = String(ticket?.source || ticket?.ticket_source || '')
  if (source === 'free-claim') return 'private-invitation'
  if (source === 'free-registration') return 'public-free'
  if (source === 'complimentary' || source === 'guest-list') return 'complimentary'
  return 'self-purchase'
}

export async function generateTicketQrSvg(verificationUrl: string): Promise<string> {
  return QRCode.toString(verificationUrl, {
    type: 'svg',
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#0A0A0A', light: '#FFFFFF' },
  })
}

export async function generateTicketQrPngBuffer(verificationUrl: string): Promise<Buffer> {
  return QRCode.toBuffer(verificationUrl, {
    type: 'png',
    width: 480,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#0A0A0A', light: '#FFFFFF' },
  })
}

let cachedBlackLogoBuffer: Buffer | null = null
async function getOfficialBlackLogoBuffer(): Promise<Buffer | null> {
  if (cachedBlackLogoBuffer) return cachedBlackLogoBuffer
  try {
    cachedBlackLogoBuffer = await fs.readFile(
      path.resolve(process.cwd(), 'public/assets/azor-tix-wordmark-black.png'),
    )
    return cachedBlackLogoBuffer
  } catch {
    return null
  }
}

export async function ensureTicketVerificationToken(
  ticketId: string,
  existingCiphertext?: string | null,
): Promise<string> {
  const existing = decryptVerificationToken(existingCiphertext)
  if (existing) return existing

  const pool = getPgPool(false)
  const rowRes = await pool.query<{
    verification_token_ciphertext: string | null
  }>(
    'SELECT "verification_token_ciphertext" FROM "tickets" WHERE "id" = $1 LIMIT 1',
    [ticketId],
  )
  const storedCipher = rowRes.rows[0]?.verification_token_ciphertext
  const decrypted = decryptVerificationToken(storedCipher)
  if (decrypted) return decrypted

  const freshToken = generateSecureVerificationToken()
  const tokenHash = hashVerificationToken(freshToken)
  const tokenCipher = encryptVerificationToken(freshToken)

  await pool.query(
    `UPDATE "tickets"
     SET "verification_token_hash" = $2,
         "verification_token_ciphertext" = $3
     WHERE "id" = $1`,
    [ticketId, tokenHash, tokenCipher],
  )

  return freshToken
}

export async function issueUniqueTicket(params: {
  payload: Payload
  issuanceKey: string
  orderId: string
  eventId: string
  ticketTypeId?: string | null
  ticketLabel?: string
  attendeeName: string
  attendeeEmail: string
  attendeePhone?: string
  acquisitionType?: TicketAcquisitionType
  purchaserName?: string
  purchaserEmail?: string
  purchaserUserId?: string | null
  giftMessage?: string
  peopleCovered?: number
  invitationLinkId?: string | null
  source: 'purchase' | 'free-registration' | 'free-claim' | 'complimentary' | 'guest-list'
}): Promise<{ ticket: any; rawToken: string; created: boolean }> {
  const existing = await params.payload.find({
    collection: 'tickets',
    overrideAccess: true,
    where: { issuanceKey: { equals: params.issuanceKey } },
    limit: 1,
    depth: 0,
  })

  if (existing.docs[0]) {
    const doc = existing.docs[0] as any
    const rawToken = await ensureTicketVerificationToken(
      String(doc.id),
      doc.verificationTokenCiphertext,
    )
    return { ticket: doc, rawToken, created: false }
  }

  const code = generateTicketCode()
  const rawToken = generateSecureVerificationToken()
  const verificationTokenHash = hashVerificationToken(rawToken)
  const verificationTokenCiphertext = encryptVerificationToken(rawToken)
  const derivedAcquisition: TicketAcquisitionType =
    params.acquisitionType ||
    (params.source === 'free-claim'
      ? 'private-invitation'
      : params.source === 'free-registration'
        ? 'public-free'
        : params.source === 'complimentary' || params.source === 'guest-list'
          ? 'complimentary'
          : 'self-purchase')

  const created = await params.payload.create({
    collection: 'tickets',
    overrideAccess: true,
    data: {
      code,
      issuanceKey: params.issuanceKey,
      verificationTokenHash,
      verificationTokenCiphertext,
      order: params.orderId,
      event: params.eventId,
      ...(params.ticketTypeId ? { ticketType: params.ticketTypeId } : {}),
      ...(params.ticketLabel ? { ticketLabel: params.ticketLabel } : {}),
      attendeeName: params.attendeeName,
      attendeeEmail: params.attendeeEmail.toLowerCase(),
      attendeePhone: params.attendeePhone || '',
      acquisitionType: derivedAcquisition,
      purchaserName: params.purchaserName || params.attendeeName,
      purchaserEmail: (params.purchaserEmail || params.attendeeEmail).toLowerCase(),
      ...(params.purchaserUserId ? { purchaserUser: params.purchaserUserId } : {}),
      ...(params.giftMessage ? { giftMessage: params.giftMessage } : {}),
      peopleCovered: Math.max(1, Number(params.peopleCovered || 1)),
      ...(params.invitationLinkId ? { invitationLink: params.invitationLinkId } : {}),
      emailDeliveryStatus: 'pending',
      emailAttempts: 0,
      source: params.source,
      status: 'valid',
    } as any,
  })

  return { ticket: created, rawToken, created: true }
}

export async function recordTicketEmailDelivery(
  ticketIds: string[],
  result: EmailDeliveryResult,
  orderId?: string,
): Promise<void> {
  const pool = getPgPool(false)
  const status = result.sent ? 'sent' : 'failed'
  const lastError = result.sent ? null : (result.reason || 'Email delivery failed.').slice(0, 500)

  if (ticketIds.length > 0) {
    await pool.query(
      `UPDATE "tickets"
       SET "email_delivery_status" = $2,
           "email_last_attempt_at" = NOW(),
           "email_last_error" = $3,
           "email_attempts" = COALESCE("email_attempts", 0) + 1,
           "updated_at" = NOW()
       WHERE "id" = ANY($1::uuid[])`,
      [ticketIds, status, lastError],
    )
  }

  if (orderId) {
    await pool.query(
      `UPDATE "orders"
       SET "email_delivery_status" = $2,
           "email_last_error" = $3,
           "email_attempts" = COALESCE("email_attempts", 0) + 1,
           "updated_at" = NOW()
       WHERE "id" = $1::uuid`,
      [orderId, status, lastError],
    )
  }
}

export async function resolveTicketForCustomerView(
  payload: Payload,
  tokenOrLegacyCode: string,
  baseUrl?: string,
): Promise<TicketDisplayRecord | null> {
  const credential = String(tokenOrLegacyCode || '').trim()
  if (!credential) return null

  const pool = getPgPool(false)
  const tokenHash = hashVerificationToken(credential)

  const rowRes = await pool.query<{
    id: string
    verification_token_hash: string | null
    verification_token_ciphertext: string | null
  }>(
    `SELECT "id", "verification_token_hash", "verification_token_ciphertext"
     FROM "tickets"
     WHERE "verification_token_hash" = $1
        OR ("verification_token_hash" IS NULL AND "code" = $2)
     LIMIT 1`,
    [tokenHash, credential],
  )
  const matchedRow = rowRes.rows[0]
  if (!matchedRow) return null

  const ticket: any = await payload
    .findByID({
      collection: 'tickets',
      id: matchedRow.id,
      overrideAccess: true,
      depth: 2,
    })
    .catch(() => null)
  if (!ticket) return null

  const rawToken =
    matchedRow.verification_token_hash === tokenHash
      ? credential
      : await ensureTicketVerificationToken(
          String(ticket.id),
          matchedRow.verification_token_ciphertext,
        )
  const event = typeof ticket.event === 'object' ? ticket.event : null
  const order = typeof ticket.order === 'object' ? ticket.order : null
  const ticketType = typeof ticket.ticketType === 'object' ? ticket.ticketType : null
  const { eventName, eventDate, eventTime, eventVenue } = formatEventDateTime(event)
  const peopleCovered = Math.max(
    1,
    Number(ticket.peopleCovered || ticketType?.groupSize || 1),
  )
  const isFree = isFreeOrderOrTicket(order, ticket)
  const acquisitionType = normalizeAcquisitionType(ticket)

  return {
    id: String(ticket.id),
    code: String(ticket.code),
    token: rawToken,
    verificationUrl: buildVerificationUrl(rawToken, baseUrl),
    sharePath: `/tickets/${encodeURIComponent(rawToken)}`,
    shareUrl: buildTicketShareUrl(rawToken, baseUrl),
    qrImagePath: `/api/tickets/${encodeURIComponent(rawToken)}/qr`,
    pdfDownloadPath: `/api/tickets/${encodeURIComponent(rawToken)}/pdf`,
    attendeeName: String(ticket.attendeeName || 'Guest'),
    attendeeEmail: String(ticket.attendeeEmail || ''),
    ticketTypeName: String(
      ticketType?.name || ticket.ticketLabel || (acquisitionType === 'private-invitation' ? 'Private Free Invitation' : 'Standard Pass'),
    ),
    eventName,
    eventDate,
    eventTime,
    eventVenue,
    orderReference: String(order?.reference || ticket.code),
    peopleCovered,
    isFree,
    acquisitionType,
    purchaserName: ticket.purchaserName || null,
    purchaserEmail: ticket.purchaserEmail || null,
    giftMessage: ticket.giftMessage || null,
    source: String(ticket.source || 'purchase'),
    status: String(ticket.status || 'valid'),
    checkedInAt: ticket.checkedInAt || null,
    emailDeliveryStatus: ticket.emailDeliveryStatus || null,
    emailLastError: ticket.emailLastError || null,
    emailAttempts: Number(ticket.emailAttempts || 0),
  }
}

export async function getTicketsForOrderDisplay(
  payload: Payload,
  order: any,
  baseUrl?: string,
): Promise<TicketDisplayRecord[]> {
  const result = await payload.find({
    collection: 'tickets',
    overrideAccess: true,
    where: { order: { equals: order.id } },
    limit: 100,
    depth: 1,
    sort: 'createdAt',
  })

  const event = typeof order.event === 'object' ? order.event : null
  const { eventName, eventDate, eventTime, eventVenue } = formatEventDateTime(event)
  const isFree = isFreeOrderOrTicket(order)

  const records: TicketDisplayRecord[] = []
  for (const ticket of result.docs as any[]) {
    const rawToken = await ensureTicketVerificationToken(String(ticket.id))
    const ticketType = typeof ticket.ticketType === 'object' ? ticket.ticketType : null
    const acquisitionType = normalizeAcquisitionType(ticket)
    const peopleCovered = Math.max(
      1,
      Number(ticket.peopleCovered || ticketType?.groupSize || 1),
    )
    records.push({
      id: String(ticket.id),
      code: String(ticket.code),
      token: rawToken,
      verificationUrl: buildVerificationUrl(rawToken, baseUrl),
      sharePath: `/tickets/${encodeURIComponent(rawToken)}`,
      shareUrl: buildTicketShareUrl(rawToken, baseUrl),
      qrImagePath: `/api/tickets/${encodeURIComponent(rawToken)}/qr`,
      pdfDownloadPath: `/api/tickets/${encodeURIComponent(rawToken)}/pdf`,
      attendeeName: String(ticket.attendeeName || 'Guest'),
      attendeeEmail: String(ticket.attendeeEmail || ''),
      ticketTypeName: String(
        ticketType?.name ||
          ticket.ticketLabel ||
          (acquisitionType === 'private-invitation' ? 'Private Free Invitation' : 'Standard Pass'),
      ),
      eventName,
      eventDate,
      eventTime,
      eventVenue,
      orderReference: String(order.reference),
      peopleCovered,
      isFree,
      acquisitionType,
      purchaserName: ticket.purchaserName || null,
      purchaserEmail: ticket.purchaserEmail || null,
      giftMessage: ticket.giftMessage || null,
      source: String(ticket.source || 'purchase'),
      status: String(ticket.status || 'valid'),
      checkedInAt: ticket.checkedInAt || null,
      emailDeliveryStatus: ticket.emailDeliveryStatus || null,
      emailLastError: ticket.emailLastError || null,
      emailAttempts: Number(ticket.emailAttempts || 0),
    })
  }
  return records
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Builds inline CID attachments (logo PNG + crisp QR PNG for each ticket) so QR codes
 * render reliably in Gmail, Apple Mail, Outlook, and mobile clients without remote image blocking.
 */
async function buildTicketEmailInlineAssets(
  tickets: TicketDisplayRecord[],
): Promise<{ logoCid: string | null; qrCids: string[]; attachments: EmailAttachment[] }> {
  const attachments: EmailAttachment[] = []
  let logoCid: string | null = null

  const logoBuf = await getOfficialBlackLogoBuffer()
  if (logoBuf) {
    logoCid = 'azortix-logo'
    attachments.push({
      filename: 'azortix-logo.png',
      content: logoBuf.toString('base64'),
      contentType: 'image/png',
      content_id: logoCid,
      cid: logoCid,
    })
  }

  const qrCids: string[] = []
  for (let i = 0; i < tickets.length; i += 1) {
    const ticket = tickets[i]
    const cid = `azortix-ticket-qr-${i}`
    const pngBuffer = await generateTicketQrPngBuffer(ticket.verificationUrl)
    attachments.push({
      filename: `AZORTIX-QR-${ticket.code}.png`,
      content: pngBuffer.toString('base64'),
      contentType: 'image/png',
      content_id: cid,
      cid,
    })
    qrCids.push(cid)
  }

  return { logoCid, qrCids, attachments }
}

function renderEmailTicketCardsHtml(params: {
  tickets: TicketDisplayRecord[]
  qrCids: string[]
  baseUrl: string
}): string {
  return params.tickets
    .map((ticket, index) => {
      const qrSrc = params.qrCids[index]
        ? `cid:${params.qrCids[index]}`
        : `${params.baseUrl}/api/tickets/${encodeURIComponent(ticket.token)}/qr?format=png`
      const ticketPageUrl = `${params.baseUrl}/tickets/${encodeURIComponent(ticket.token)}`
      const pdfUrl = `${params.baseUrl}/api/tickets/${encodeURIComponent(ticket.token)}/pdf`
      const passLabel =
        params.tickets.length > 1
          ? `Ticket ${index + 1} of ${params.tickets.length}`
          : 'Individual Admission Pass'
      return `
        <tr>
          <td style="padding: 24px 0 0 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #E4E4E7; background-color: #FFFFFF;">
              <tr>
                <td style="padding: 14px 24px; border-bottom: 1px solid #F4F4F5; background-color: #FAFAFA;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #52525B;">${escapeHtml(passLabel)}</td>
                      <td align="right" style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #C81E1E;">One-Time Entry QR</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 28px 24px 20px 24px; background-color: #FFFFFF;">
                  <img src="${escapeHtml(qrSrc)}" alt="Unique QR code for ${escapeHtml(ticket.code)}" width="210" height="210" style="display: block; width: 210px; height: 210px; border: 1px solid #E4E4E7; padding: 10px; background: #FFFFFF;" />
                </td>
              </tr>
              <tr>
                <td style="padding: 0 24px 24px 24px; text-align: center;">
                  <div style="font-size: 18px; font-weight: 700; color: #0A0A0A; margin: 0 0 4px 0;">${escapeHtml(ticket.attendeeName)}</div>
                  <div style="font-size: 14px; font-weight: 600; color: #3F3F46; margin: 0 0 8px 0;">${escapeHtml(ticket.ticketTypeName)}</div>
                  <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 13px; letter-spacing: 0.1em; color: #0A0A0A; background: #F4F4F5; display: inline-block; padding: 6px 12px; margin: 0 0 10px 0;">${escapeHtml(ticket.code)}</div>
                  <div style="font-size: 13px; color: #71717A; margin: 0 0 18px 0;">${escapeHtml(ticket.eventName)}</div>
                  <div style="margin: 0 0 12px 0;">
                    <a href="${escapeHtml(ticketPageUrl)}" style="display: inline-block; background-color: #0A0A0A; color: #FFFFFF; text-decoration: none; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; padding: 13px 24px;">VIEW AND SHARE YOUR TICKET</a>
                  </div>
                  <div style="margin: 0 0 12px 0;">
                    <a href="${escapeHtml(pdfUrl)}" style="font-size: 12px; font-weight: 600; color: #18181B; text-decoration: underline;">Download PDF Ticket</a>
                  </div>
                  <div style="font-size: 11px; color: #71717A; word-break: break-all;">
                    Ticket code fallback: <strong>${escapeHtml(ticket.code)}</strong> · Verification link: <a href="${escapeHtml(ticketPageUrl)}" style="color: #52525B;">${escapeHtml(ticketPageUrl)}</a>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    })
    .join('')
}

/**
 * Builds the premium black/white/grey/minimal-red AZORTIX confirmation email with inline CID QR PNGs.
 * Supports self-purchases, public free registrations, gift recipients, and private free invitations.
 */
export async function buildTicketConfirmationEmail(params: {
  buyerName: string
  event: any
  order: any
  tickets: TicketDisplayRecord[]
  baseUrl?: string
  variant?: 'standard' | 'gift-recipient' | 'private-invitation'
  senderName?: string
  personalMessage?: string
}): Promise<{ subject: string; html: string; text: string; attachments: EmailAttachment[] }> {
  const baseUrl = getTicketBaseUrl(params.baseUrl)
  const { eventName, eventDate, eventTime, eventVenue } = formatEventDateTime(params.event)
  const variant = params.variant || 'standard'
  const isFree =
    variant === 'private-invitation' || isFreeOrderOrTicket(params.order, params.tickets[0])
  const peopleCovered = params.tickets.reduce(
    (sum, t) => sum + Math.max(1, Number(t.peopleCovered || 1)),
    0,
  )
  const peopleLabel = `${peopleCovered} ${peopleCovered === 1 ? 'person' : 'people'}`
  const { logoCid, qrCids, attachments } = await buildTicketEmailInlineAssets(params.tickets)
  const logoSrc = logoCid ? `cid:${logoCid}` : `${baseUrl}/assets/azor-tix-wordmark-black.png`

  let heading = 'Your tickets are ready!'
  let subject = isFree
    ? `Your tickets are ready! Free RSVP confirmed for ${eventName} — AZORTIX`
    : `Your tickets are ready! ${eventName} (${params.order.reference}) — AZORTIX`
  let introLinesHtml = ''
  let introLinesText: string[] = []

  if (variant === 'gift-recipient') {
    const gifter = params.senderName || params.tickets[0]?.purchaserName || 'Someone special'
    heading = "You've received a ticket gift!"
    subject = `You've received a ticket gift for ${eventName} — AZORTIX`
    const giftMsg = (params.personalMessage || params.tickets[0]?.giftMessage || '').trim()
    introLinesHtml = `
      <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #18181B;">Hello, ${escapeHtml(params.buyerName)}</p>
      <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #3F3F46;"><strong style="color: #0A0A0A;">${escapeHtml(gifter)}</strong> has gifted you a ticket to <strong style="color: #0A0A0A;">${escapeHtml(eventName)}</strong> on AZORTIX.</p>
      ${giftMsg ? `<div style="margin: 14px 0; padding: 14px 18px; border-left: 3px solid #C81E1E; background-color: #FAFAFA; font-size: 14px; line-height: 1.6; color: #18181B;"><em>&ldquo;${escapeHtml(giftMsg)}&rdquo;</em><div style="margin-top: 6px; font-size: 12px; color: #71717A;">— ${escapeHtml(gifter)}</div></div>` : ''}
      <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #3F3F46;">Your unique one-time entry QR pass is ready below. We look forward to welcoming you to <strong style="color: #0A0A0A;">${escapeHtml(eventName)}</strong>.</p>
    `
    introLinesText = [
      `Hello, ${params.buyerName}`,
      `${gifter} has gifted you a ticket to ${eventName} on AZORTIX.`,
      ...(giftMsg ? [`Personal gift message: "${giftMsg}"`] : []),
      `We look forward to welcoming you to ${eventName}.`,
    ]
  } else if (variant === 'private-invitation') {
    heading = 'Your AZORTIX invitation is confirmed!'
    subject = `Your AZORTIX invitation is confirmed! ${eventName}`
    const inviteMsg = (params.personalMessage || '').trim()
    introLinesHtml = `
      <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #18181B;">Hello, ${escapeHtml(params.buyerName)}</p>
      <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #3F3F46;">Your private invitation ticket for <strong style="color: #0A0A0A;">${escapeHtml(eventName)}</strong> has been confirmed.</p>
      <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #0A0A0A; font-weight: 600;">No payment required. Your private invitation pass is active and ready for check-in.</p>
      ${inviteMsg ? `<div style="margin: 14px 0; padding: 14px 18px; border-left: 3px solid #0A0A0A; background-color: #FAFAFA; font-size: 14px; line-height: 1.6; color: #18181B;">${escapeHtml(inviteMsg)}</div>` : ''}
      <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #3F3F46;">We look forward to welcoming you to <strong style="color: #0A0A0A;">${escapeHtml(eventName)}</strong>.</p>
    `
    introLinesText = [
      `Hello, ${params.buyerName}`,
      `Your private invitation ticket for ${eventName} has been confirmed.`,
      'No payment required. Your private invitation pass is active and ready for check-in.',
      ...(inviteMsg ? [`Organizer note: ${inviteMsg}`] : []),
      `We look forward to welcoming you to ${eventName}.`,
    ]
  } else {
    const paymentSentence = isFree
      ? 'No payment required. Your RSVP registration has been confirmed.'
      : 'Your ticket purchase was successful.'
    introLinesHtml = `
      <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #18181B;">Hello, ${escapeHtml(params.buyerName)}</p>
      <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #3F3F46;">Your ticket registration for <strong style="color: #0A0A0A;">${escapeHtml(eventName)}</strong> has been confirmed.</p>
      <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #0A0A0A; font-weight: 600;">${escapeHtml(paymentSentence)}</p>
      <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #3F3F46;">We look forward to welcoming you to <strong style="color: #0A0A0A;">${escapeHtml(eventName)}</strong>.</p>
    `
    introLinesText = [
      `Hello, ${params.buyerName}`,
      `Your ticket registration for ${eventName} has been confirmed.`,
      paymentSentence,
      `We look forward to welcoming you to ${eventName}.`,
    ]
  }

  const ticketCardsHtml = renderEmailTicketCardsHtml({
    tickets: params.tickets,
    qrCids,
    baseUrl,
  })

  // Note: For gift recipients we NEVER show buyer payment info or totals.
  const orderReferenceBlock =
    variant === 'gift-recipient'
      ? ''
      : `
            <tr>
              <td style="padding: 0 32px 24px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFAFA; border: 1px solid #E4E4E7;">
                  <tr>
                    <td style="padding: 18px 24px; text-align: center;">
                      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #71717A; margin-bottom: 6px;">Order Reference</div>
                      <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 15px; font-weight: 700; color: #0A0A0A;">${escapeHtml(String(params.order.reference))}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F4F4F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0A0A0A;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4F4F5; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E4E4E7;">
            <tr>
              <td style="height: 4px; background-color: #0A0A0A; font-size: 0; line-height: 0;">&nbsp;</td>
            </tr>
            <tr>
              <td align="center" style="padding: 36px 32px 24px 32px; border-bottom: 1px solid #F4F4F5;">
                <img src="${escapeHtml(logoSrc)}" alt="AZORTIX" width="164" style="display: block; width: 164px; height: auto; border: 0;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 32px 32px 16px 32px;">
                <h1 style="margin: 0 0 18px 0; font-size: 28px; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em; color: #0A0A0A;">${escapeHtml(heading)}</h1>
                ${introLinesHtml}
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 32px 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #E4E4E7; border-bottom: 1px solid #E4E4E7;">
                  <tr>
                    <td style="padding: 14px 0; border-bottom: 1px solid #F4F4F5; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717A; width: 38%;">Event</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #F4F4F5; font-size: 14px; font-weight: 600; color: #0A0A0A;">${escapeHtml(eventName)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; border-bottom: 1px solid #F4F4F5; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717A;">Date</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #F4F4F5; font-size: 14px; font-weight: 500; color: #0A0A0A;">${escapeHtml(eventDate)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; border-bottom: 1px solid #F4F4F5; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717A;">Time</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #F4F4F5; font-size: 14px; font-weight: 500; color: #0A0A0A;">${escapeHtml(eventTime)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; border-bottom: 1px solid #F4F4F5; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717A;">Venue</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #F4F4F5; font-size: 14px; font-weight: 500; color: #0A0A0A;">${escapeHtml(eventVenue)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717A;">People Covered</td>
                    <td style="padding: 14px 0; font-size: 14px; font-weight: 600; color: #0A0A0A;">${escapeHtml(peopleLabel)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 32px 24px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${ticketCardsHtml}
                </table>
              </td>
            </tr>
            ${orderReferenceBlock}
            <tr>
              <td style="padding: 24px 32px 32px 32px; border-top: 1px solid #E4E4E7; text-align: center; background-color: #FFFFFF;">
                <div style="font-size: 14px; font-weight: 700; color: #0A0A0A; margin-bottom: 6px;">Questions?</div>
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #52525B;">For assistance with your ticket or event registration, contact:</p>
                <a href="mailto:${SUPPORT_EMAIL}" style="font-size: 14px; font-weight: 600; color: #C81E1E; text-decoration: none;">${SUPPORT_EMAIL}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const ticketLines = params.tickets
    .map(
      (ticket, idx) =>
        `Ticket ${idx + 1}: ${ticket.attendeeName} | ${ticket.ticketTypeName} | Code: ${ticket.code} | View & Share: ${baseUrl}/tickets/${encodeURIComponent(ticket.token)}`,
    )
    .join('\n')

  const text = [
    'AZORTIX',
    '',
    heading,
    '',
    ...introLinesText,
    '',
    'Event Information',
    `Event: ${eventName}`,
    `Date: ${eventDate}`,
    `Time: ${eventTime}`,
    `Venue: ${eventVenue}`,
    `People covered: ${peopleLabel}`,
    '',
    'Your Tickets',
    ticketLines,
    ...(variant === 'gift-recipient' ? [] : ['', `Order Reference: ${params.order.reference}`]),
    '',
    'Questions?',
    `For assistance with your ticket or event registration, contact: ${SUPPORT_EMAIL}`,
  ].join('\n')

  return { subject, html, text, attachments }
}

/**
 * Builds the purchase confirmation email sent to the purchaser for gift-only or mixed (self + gift) orders.
 * For mixed orders, includes the buyer's own QR ticket(s) inline via CID alongside the full gift recipient summary.
 */
export async function buildGiftPurchaserConfirmationEmail(params: {
  purchaserName: string
  event: any
  order: any
  tickets: TicketDisplayRecord[]
  selfTickets?: TicketDisplayRecord[]
  giftTickets?: TicketDisplayRecord[]
  baseUrl?: string
}): Promise<{ subject: string; html: string; text: string; attachments: EmailAttachment[] }> {
  const baseUrl = getTicketBaseUrl(params.baseUrl)
  const { eventName, eventDate, eventTime, eventVenue } = formatEventDateTime(params.event)
  const logoBuf = await getOfficialBlackLogoBuffer()
  const attachments: EmailAttachment[] = []
  let logoSrc = `${baseUrl}/assets/azor-tix-wordmark-black.png`
  if (logoBuf) {
    attachments.push({
      filename: 'azortix-logo.png',
      content: logoBuf.toString('base64'),
      contentType: 'image/png',
      content_id: 'azortix-logo',
      cid: 'azortix-logo',
    })
    logoSrc = 'cid:azortix-logo'
  }

  const selfTickets =
    params.selfTickets ?? params.tickets.filter((t) => t.acquisitionType !== 'gift')
  const giftTickets =
    params.giftTickets ??
    (params.selfTickets
      ? params.tickets.filter((t) => t.acquisitionType === 'gift')
      : params.tickets.filter((t) => t.acquisitionType === 'gift').length > 0
        ? params.tickets.filter((t) => t.acquisitionType === 'gift')
        : params.tickets)

  const isMixed = selfTickets.length > 0 && giftTickets.length > 0

  // Attach inline CID QR PNGs for any tickets belonging to the buyer themselves
  const selfQrCids: string[] = []
  for (let i = 0; i < selfTickets.length; i += 1) {
    const ticket = selfTickets[i]
    const qrBuf = await generateTicketQrPngBuffer(ticket.verificationUrl)
    const cid = `azortix-ticket-qr-${i}`
    attachments.push({
      filename: `azortix-qr-${ticket.code.replace(/[^A-Za-z0-9-_]/g, '')}.png`,
      content: qrBuf.toString('base64'),
      contentType: 'image/png',
      content_id: cid,
      cid,
    })
    selfQrCids.push(cid)
  }

  const totalNgn = Number(params.order?.total || 0)
  const totalDisplay = totalNgn === 0 ? '₦0 (Free)' : `₦${totalNgn.toLocaleString()}`
  const subject = isMixed
    ? `Your tickets & gift order are confirmed: ${eventName} (${params.order.reference}) — AZORTIX`
    : `Gift purchase confirmed: ${eventName} (${params.order.reference}) — AZORTIX`
  const heading = isMixed
    ? 'Your tickets & gift order are confirmed!'
    : 'Your gift purchase is confirmed!'

  const introParagraph = isMixed
    ? `Thank you for your order for <strong style="color: #0A0A0A;">${escapeHtml(eventName)}</strong>. Your own ${selfTickets.length === 1 ? 'digital QR ticket is' : `${selfTickets.length} digital QR tickets are`} included below, and each of your ${giftTickets.length} gift ${giftTickets.length === 1 ? 'recipient has' : 'recipients has'} been emailed their own private pass separately.`
    : `Thank you for gifting ${giftTickets.length} ticket${giftTickets.length === 1 ? '' : 's'} to <strong style="color: #0A0A0A;">${escapeHtml(eventName)}</strong>. Each recipient has been sent their own private digital ticket and unique QR code separately.`

  const selfTicketCardsHtml =
    selfTickets.length > 0
      ? `
        <tr>
          <td style="padding: 16px 32px 8px 32px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #0A0A0A; margin-bottom: 12px;">
              Your Ticket${selfTickets.length === 1 ? '' : 's'} (${selfTickets.length})
            </div>
            ${renderEmailTicketCardsHtml({
              tickets: selfTickets,
              qrCids: selfQrCids,
              baseUrl,
            })}
          </td>
        </tr>`
      : ''

  const recipientRowsHtml = giftTickets
    .map(
      (t, idx) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #F4F4F5; font-size: 13px; color: #0A0A0A;">
            <strong>${idx + 1}. ${escapeHtml(t.attendeeName)}</strong><br/>
            <span style="color: #71717A;">${escapeHtml(t.attendeeEmail)} · ${escapeHtml(t.ticketTypeName)}</span>
          </td>
          <td align="right" style="padding: 12px 0; border-bottom: 1px solid #F4F4F5; font-family: monospace; font-size: 12px; color: #0A0A0A;">
            ${escapeHtml(t.code)}
          </td>
        </tr>`,
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F4F4F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0A0A0A;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4F4F5; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E4E4E7;">
            <tr><td style="height: 4px; background-color: #0A0A0A;">&nbsp;</td></tr>
            <tr>
              <td align="center" style="padding: 36px 32px 24px 32px; border-bottom: 1px solid #F4F4F5;">
                <img src="${escapeHtml(logoSrc)}" alt="AZORTIX" width="164" style="display: block; width: 164px; height: auto; border: 0;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 32px 32px 16px 32px;">
                <h1 style="margin: 0 0 14px 0; font-size: 26px; font-weight: 700; color: #0A0A0A;">${escapeHtml(heading)}</h1>
                <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #18181B;">Hello, ${escapeHtml(params.purchaserName)}</p>
                <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #3F3F46;">${introParagraph}</p>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #0A0A0A;">Total Paid: ${escapeHtml(totalDisplay)} · Order Reference: ${escapeHtml(String(params.order.reference))}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 32px 16px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #E4E4E7; border-bottom: 1px solid #E4E4E7;">
                  <tr>
                    <td style="padding: 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717A;">Event</td>
                    <td style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #0A0A0A;">${escapeHtml(eventName)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717A;">Schedule</td>
                    <td style="padding: 12px 0; font-size: 14px; color: #0A0A0A;">${escapeHtml(eventDate)} · ${escapeHtml(eventTime)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717A;">Venue</td>
                    <td style="padding: 12px 0; font-size: 14px; color: #0A0A0A;">${escapeHtml(eventVenue)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            ${selfTicketCardsHtml}
            <tr>
              <td style="padding: 8px 32px 24px 32px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #71717A; margin-bottom: 8px;">Gift Recipients (${giftTickets.length})</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${recipientRowsHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 32px 32px 32px; border-top: 1px solid #E4E4E7; text-align: center;">
                <div style="font-size: 14px; font-weight: 700; color: #0A0A0A; margin-bottom: 6px;">Questions?</div>
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #52525B;">For assistance with your order, contact:</p>
                <a href="mailto:${SUPPORT_EMAIL}" style="font-size: 14px; font-weight: 600; color: #C81E1E; text-decoration: none;">${SUPPORT_EMAIL}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = [
    'AZORTIX',
    '',
    heading,
    `Hello, ${params.purchaserName}`,
    `Order Reference: ${params.order.reference}`,
    `Total Paid: ${totalDisplay}`,
    `Event: ${eventName} — ${eventDate} · ${eventTime} — ${eventVenue}`,
    ...(selfTickets.length > 0
      ? [
          '',
          `Your Ticket${selfTickets.length === 1 ? '' : 's'}:`,
          ...selfTickets.map(
            (t, i) =>
              `${i + 1}. ${t.attendeeName} — ${t.ticketTypeName} — Code: ${t.code} — Pass: ${t.shareUrl}`,
          ),
        ]
      : []),
    '',
    'Gift Recipients:',
    ...giftTickets.map(
      (t, i) => `${i + 1}. ${t.attendeeName} (${t.attendeeEmail}) — ${t.ticketTypeName} — ${t.code}`,
    ),
    '',
    `Questions? Contact ${SUPPORT_EMAIL}`,
  ].join('\n')

  return { subject, html, text, attachments }
}

/**
 * Safely resends a ticket email (standard, gift recipient, or private invitation)
 * without creating any duplicate tickets or re-charging the customer.
 */
export async function resendTicketEmailById(params: {
  payload: Payload
  ticketId: string
  baseUrl?: string
}): Promise<{ ok: boolean; delivery: EmailDeliveryResult; ticketCode?: string; recipientEmail?: string }> {
  const ticketDoc: any = await params.payload
    .findByID({
      collection: 'tickets',
      id: params.ticketId,
      overrideAccess: true,
      depth: 2,
    })
    .catch(() => null)
  if (!ticketDoc) {
    return {
      ok: false,
      delivery: { sent: false, configured: false, reason: 'Ticket not found.' },
    }
  }

  const rawToken = await ensureTicketVerificationToken(String(ticketDoc.id))
  const display = await resolveTicketForCustomerView(params.payload, rawToken, params.baseUrl)
  if (!display) {
    return {
      ok: false,
      delivery: { sent: false, configured: false, reason: 'Ticket display record unavailable.' },
    }
  }

  const event = typeof ticketDoc.event === 'object' ? ticketDoc.event : null
  const order = typeof ticketDoc.order === 'object' ? ticketDoc.order : { reference: ticketDoc.code }
  const variant =
    display.acquisitionType === 'gift'
      ? 'gift-recipient'
      : display.acquisitionType === 'private-invitation'
        ? 'private-invitation'
        : 'standard'

  const emailPayload = await buildTicketConfirmationEmail({
    buyerName: display.attendeeName,
    event,
    order,
    tickets: [display],
    baseUrl: params.baseUrl,
    variant,
    senderName: display.purchaserName || undefined,
    personalMessage: display.giftMessage || undefined,
  })

  const delivery = await sendTransactionalEmail({
    payload: params.payload,
    to: display.attendeeEmail,
    subject: emailPayload.subject,
    title:
      variant === 'gift-recipient'
        ? "You've received a ticket gift!"
        : variant === 'private-invitation'
          ? 'Your AZORTIX invitation is confirmed!'
          : 'Your tickets are ready!',
    bodyHtml: emailPayload.html,
    text: emailPayload.text,
    rawHtml: true,
    attachments: emailPayload.attachments,
  })

  await recordTicketEmailDelivery([String(ticketDoc.id)], delivery)

  return {
    ok: delivery.sent,
    delivery,
    ticketCode: display.code,
    recipientEmail: display.attendeeEmail,
  }
}

/**
 * Generates a crisp, print-grade A4 digital invitation PDF for an individual ticket.
 */
export async function generateTicketPdfBuffer(ticket: TicketDisplayRecord): Promise<Buffer> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595.28, 841.89]) // A4 portrait
  const { width, height } = page.getSize()

  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const fontMono = await pdf.embedFont(StandardFonts.CourierBold)

  const black = rgb(0.04, 0.04, 0.04)
  const darkGrey = rgb(0.24, 0.24, 0.27)
  const mutedGrey = rgb(0.45, 0.45, 0.48)
  const borderGrey = rgb(0.89, 0.89, 0.91)
  const surfaceGrey = rgb(0.98, 0.98, 0.985)
  const accentRed = rgb(0.78, 0.12, 0.12)

  const marginX = 48
  const cardWidth = width - marginX * 2

  page.drawRectangle({
    x: marginX,
    y: 44,
    width: cardWidth,
    height: height - 88,
    borderColor: borderGrey,
    borderWidth: 1,
    color: rgb(1, 1, 1),
  })
  page.drawRectangle({
    x: marginX,
    y: height - 48,
    width: cardWidth,
    height: 4,
    color: black,
  })

  let y = height - 88

  const logoBytes = await getOfficialBlackLogoBuffer()
  if (logoBytes) {
    const logoImg = await pdf.embedPng(logoBytes)
    const logoWidth = 148
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth
    page.drawImage(logoImg, {
      x: (width - logoWidth) / 2,
      y: y - logoHeight + 16,
      width: logoWidth,
      height: logoHeight,
    })
    y -= logoHeight + 12
  } else {
    page.drawText('AZORTIX', {
      x: width / 2 - 40,
      y,
      size: 18,
      font: fontBold,
      color: black,
    })
    y -= 28
  }

  page.drawLine({
    start: { x: marginX + 28, y },
    end: { x: width - marginX - 28, y },
    thickness: 0.75,
    color: borderGrey,
  })
  y -= 32

  const contentX = marginX + 32
  const pdfHeading =
    ticket.acquisitionType === 'gift'
      ? "You've received a ticket gift!"
      : ticket.acquisitionType === 'private-invitation'
        ? 'Your AZORTIX invitation is confirmed!'
        : 'Your tickets are ready!'

  page.drawText(pdfHeading, {
    x: contentX,
    y,
    size: 21,
    font: fontBold,
    color: black,
  })
  y -= 24

  page.drawText(`Hello, ${ticket.attendeeName}`, {
    x: contentX,
    y,
    size: 11.5,
    font: fontRegular,
    color: black,
  })
  y -= 17

  const truncate = (s: string, maxLen: number) =>
    s.length > maxLen ? `${s.slice(0, maxLen - 1)}...` : s

  page.drawText(
    truncate(
      ticket.acquisitionType === 'gift' && ticket.purchaserName
        ? `Gifted to you by ${ticket.purchaserName} for ${ticket.eventName}.`
        : `Your ticket registration for ${ticket.eventName} has been confirmed.`,
      78,
    ),
    { x: contentX, y, size: 11, font: fontRegular, color: darkGrey },
  )
  y -= 17

  const paymentLine =
    ticket.acquisitionType === 'gift'
      ? 'Gift ticket — valid for one-time admission at the event entrance.'
      : ticket.acquisitionType === 'private-invitation'
        ? 'No payment required. Your private invitation pass is confirmed.'
        : ticket.isFree
          ? 'No payment required. Your RSVP registration has been confirmed.'
          : 'Your ticket purchase was successful.'
  page.drawText(paymentLine, {
    x: contentX,
    y,
    size: 11,
    font: fontBold,
    color: black,
  })
  y -= 17

  page.drawText(truncate(`We look forward to welcoming you to ${ticket.eventName}.`, 78), {
    x: contentX,
    y,
    size: 11,
    font: fontRegular,
    color: darkGrey,
  })
  y -= 24

  const infoBoxHeight = 122
  page.drawRectangle({
    x: contentX,
    y: y - infoBoxHeight,
    width: cardWidth - 64,
    height: infoBoxHeight,
    color: surfaceGrey,
    borderColor: borderGrey,
    borderWidth: 0.75,
  })

  const peopleLabel = `${ticket.peopleCovered} ${ticket.peopleCovered === 1 ? 'person' : 'people'}`
  const rows: Array<[string, string]> = [
    ['EVENT', truncate(ticket.eventName, 54)],
    ['DATE', truncate(ticket.eventDate, 54)],
    ['TIME', truncate(ticket.eventTime, 54)],
    ['VENUE', truncate(ticket.eventVenue, 54)],
    ['PEOPLE COVERED', peopleLabel],
  ]

  let rowY = y - 20
  for (const [label, val] of rows) {
    page.drawText(label, {
      x: contentX + 16,
      y: rowY,
      size: 8.5,
      font: fontBold,
      color: mutedGrey,
    })
    page.drawText(val, {
      x: contentX + 132,
      y: rowY,
      size: 10,
      font: fontBold,
      color: black,
    })
    rowY -= 22
  }
  y -= infoBoxHeight + 26

  const qrPng = await generateTicketQrPngBuffer(ticket.verificationUrl)
  const qrImg = await pdf.embedPng(qrPng)
  const qrSize = 176
  const qrX = (width - qrSize) / 2
  const qrY = y - qrSize

  page.drawRectangle({
    x: qrX - 10,
    y: qrY - 10,
    width: qrSize + 20,
    height: qrSize + 20,
    borderColor: borderGrey,
    borderWidth: 1,
    color: rgb(1, 1, 1),
  })
  page.drawImage(qrImg, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  })
  y = qrY - 26

  const drawCentered = (
    text: string,
    yPos: number,
    size: number,
    font: typeof fontRegular,
    color: ReturnType<typeof rgb>,
  ) => {
    const textWidth = font.widthOfTextAtSize(text, size)
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: yPos,
      size,
      font,
      color,
    })
  }

  drawCentered(truncate(ticket.attendeeName, 48), y, 15, fontBold, black)
  y -= 18
  drawCentered(truncate(ticket.ticketTypeName, 48), y, 11.5, fontBold, darkGrey)
  y -= 20
  drawCentered(ticket.code, y, 11, fontMono, black)
  y -= 17
  drawCentered(truncate(ticket.eventName, 56), y, 10, fontRegular, mutedGrey)
  y -= 22

  const statusDisplay =
    ticket.status === 'valid'
      ? 'VALID ONE-TIME ENTRY TICKET'
      : `TICKET STATUS: ${ticket.status.toUpperCase()}`
  drawCentered(statusDisplay, y, 8.5, fontBold, ticket.status === 'valid' ? black : accentRed)
  y -= 26

  if (ticket.acquisitionType !== 'gift') {
    page.drawRectangle({
      x: contentX,
      y: y - 42,
      width: cardWidth - 64,
      height: 42,
      color: surfaceGrey,
      borderColor: borderGrey,
      borderWidth: 0.75,
    })
    drawCentered('ORDER REFERENCE', y - 15, 8, fontBold, mutedGrey)
    drawCentered(ticket.orderReference, y - 31, 10.5, fontMono, black)
    y -= 62
  } else {
    y -= 16
  }

  drawCentered('Questions?', y, 10.5, fontBold, black)
  y -= 14
  drawCentered(
    'For assistance with your ticket or event registration, contact:',
    y,
    9.5,
    fontRegular,
    mutedGrey,
  )
  y -= 14
  drawCentered(SUPPORT_EMAIL, y, 10, fontBold, accentRed)

  const bytes = await pdf.save()
  return Buffer.from(bytes)
}

/**
 * Checks whether an authenticated user is authorized to validate tickets for a specific event.
 * Enforces event-level assignment for check-in staff (`assigned_events` on `team_memberships`).
 */
export async function canUserValidateEvent(
  client: { query: (sqlText: string, params?: any[]) => Promise<{ rows: any[] }> },
  user: { id: string; email?: string; role?: string },
  eventOrganizerId: string,
  eventId: string,
): Promise<boolean> {
  if (user.role === 'admin' || user.role === 'super-admin') return true
  if (String(eventOrganizerId) === String(user.id)) return true

  if (user.email) {
    const teamRes = await client.query(
      `SELECT tm."id", tm."role"::text AS role, tm."assigned_events"
       FROM "team_memberships" tm
       WHERE tm."organizer_id" = $1
         AND lower(tm."email") = lower($2)
         AND tm."active" = true
         AND (tm."invitation_status" IS NULL OR tm."invitation_status" != 'revoked')
         AND tm."role" IN ('manager', 'check-in')`,
      [eventOrganizerId, user.email],
    )
    for (const row of teamRes.rows) {
      const assigned = Array.isArray(row.assigned_events)
        ? row.assigned_events.map(String).filter(Boolean)
        : []
      if (assigned.length > 0) {
        if (assigned.includes(String(eventId))) return true
      } else if (row.role === 'manager') {
        return true
      }
    }
  }

  return false
}

/**
 * Returns event IDs that a team staff member has been explicitly assigned to check in.
 */
export async function getAssignedStaffEventsForUser(user: {
  id: string
  email?: string
  role?: string
}): Promise<
  Array<{
    id: string
    title: string
    startsAt: string | null
    venue: string
    address: string
    city: string
    checkInStatus: 'open' | 'closed'
    organizerId: string
  }>
> {
  if (!user.email) return []
  const pool = getPgPool(false)
  const memberships = await pool.query<{
    organizer_id: string
    role: string
    assigned_events: string[] | null
  }>(
    `SELECT "organizer_id", "role"::text AS role, "assigned_events"
     FROM "team_memberships"
     WHERE lower("email") = lower($1)
       AND "active" = true
       AND ("invitation_status" IS NULL OR "invitation_status" != 'revoked')
       AND "role" IN ('manager', 'check-in')`,
    [user.email],
  )
  if (memberships.rows.length === 0) return []

  const explicitEventIds = new Set<string>()
  const managerOrganizerIds = new Set<string>()
  for (const m of memberships.rows) {
    const assigned = Array.isArray(m.assigned_events)
      ? m.assigned_events.map(String).filter(Boolean)
      : []
    if (assigned.length > 0) {
      for (const eid of assigned) explicitEventIds.add(eid)
    } else if (m.role === 'manager') {
      managerOrganizerIds.add(String(m.organizer_id))
    }
  }

  const eventsRes = await pool.query<{
    id: string
    title: string
    starts_at: string | null
    venue: string | null
    address: string | null
    city: string | null
    check_in_status: string | null
    organizer_id: string
  }>(
    `SELECT "id", "title", "starts_at", "venue", "address", "city",
            COALESCE("check_in_status"::text, 'closed') AS check_in_status,
            "organizer_id"
     FROM "events"
     WHERE ("id" = ANY($1::uuid[]) OR "organizer_id" = ANY($2::uuid[]))
     ORDER BY "starts_at" DESC NULLS LAST`,
    [Array.from(explicitEventIds), Array.from(managerOrganizerIds)],
  )

  return eventsRes.rows.map((r) => ({
    id: String(r.id),
    title: String(r.title || 'Untitled event'),
    startsAt: r.starts_at,
    venue: String(r.venue || ''),
    address: String(r.address || ''),
    city: String(r.city || 'Abuja'),
    checkInStatus: r.check_in_status === 'open' ? 'open' : 'closed',
    organizerId: String(r.organizer_id),
  }))
}

export async function getEventAttendanceStats(eventId: string): Promise<EventAttendanceStats | null> {
  const pool = getPgPool(false)
  const evRes = await pool.query<{
    id: string
    title: string
    starts_at: string | null
    venue: string | null
    address: string | null
    city: string | null
    event_format: string | null
    check_in_status: string | null
  }>(
    `SELECT "id", "title", "starts_at", "venue", "address", "city", "event_format"::text AS event_format,
            COALESCE("check_in_status"::text, 'closed') AS check_in_status
     FROM "events"
     WHERE "id" = $1::uuid
     LIMIT 1`,
    [eventId],
  )
  const ev = evRes.rows[0]
  if (!ev) return null

  const { eventName, eventDate, eventTime, eventVenue } = formatEventDateTime({
    title: ev.title,
    startsAt: ev.starts_at,
    venue: ev.venue,
    address: ev.address,
    city: ev.city,
    eventFormat: ev.event_format,
  })

  const statsRes = await pool.query<{
    status: string
    source: string
    acquisition_type: string | null
    people_covered: string | number | null
  }>(
    `SELECT t."status"::text AS status,
            COALESCE(t."source"::text, 'purchase') AS source,
            t."acquisition_type",
            COALESCE(t."people_covered", 1) AS people_covered
     FROM "tickets" t
     LEFT JOIN "orders" o ON o."id" = t."order_id"
     WHERE t."event_id" = $1::uuid
       AND (o."status"::text IS NULL OR o."status"::text IN ('paid', 'refunded', 'cancelled'))`,
    [eventId],
  )

  let totalTicketsIssued = 0
  let paidTickets = 0
  let giftTickets = 0
  let privateInvitationTickets = 0
  let publicFreeTickets = 0
  let expectedAttendees = 0
  let checkedInTickets = 0
  let checkedInAttendees = 0
  let cancelledTickets = 0
  let refundedTickets = 0

  for (const row of statsRes.rows) {
    const people = Math.max(1, Number(row.people_covered || 1))
    const acq = normalizeAcquisitionType(row)

    if (row.status === 'refunded') {
      refundedTickets += 1
      continue
    }
    if (row.status === 'cancelled' || row.status === 'void') {
      cancelledTickets += 1
      continue
    }

    totalTicketsIssued += 1
    expectedAttendees += people
    if (acq === 'gift') giftTickets += 1
    else if (acq === 'private-invitation' || acq === 'complimentary') privateInvitationTickets += 1
    else if (acq === 'public-free') publicFreeTickets += 1
    else paidTickets += 1

    if (row.status === 'used') {
      checkedInTickets += 1
      checkedInAttendees += people
    }
  }

  const remainingTickets = Math.max(0, totalTicketsIssued - checkedInTickets)
  const remainingAttendees = Math.max(0, expectedAttendees - checkedInAttendees)
  const checkInPercent =
    expectedAttendees > 0 ? Math.round((checkedInAttendees / expectedAttendees) * 100) : 0

  const recentRes = await pool.query<{
    id: string
    code: string
    attendee_name: string
    ticket_type_name: string | null
    ticket_label: string | null
    acquisition_type: string | null
    source: string | null
    people_covered: number | string | null
    checked_in_at: string
    checked_in_by_name: string | null
  }>(
    `SELECT t."id", t."code", t."attendee_name", tt."name" AS ticket_type_name, t."ticket_label",
            t."acquisition_type", t."source"::text AS source,
            COALESCE(t."people_covered", 1) AS people_covered,
            t."checked_in_at",
            COALESCE(u."name", u."email", 'Staff') AS checked_in_by_name
     FROM "tickets" t
     LEFT JOIN "ticket_types" tt ON tt."id" = t."ticket_type_id"
     LEFT JOIN "users" u ON u."id" = t."checked_in_by_id"
     WHERE t."event_id" = $1::uuid
       AND t."status" = 'used'
       AND t."checked_in_at" IS NOT NULL
     ORDER BY t."checked_in_at" DESC
     LIMIT 12`,
    [eventId],
  )

  return {
    eventId: String(ev.id),
    eventTitle: eventName,
    eventDate,
    eventTime,
    eventVenue,
    checkInStatus: ev.check_in_status === 'open' ? 'open' : 'closed',
    totalTicketsIssued,
    paidTickets,
    giftTickets,
    privateInvitationTickets,
    publicFreeTickets,
    expectedAttendees,
    checkedInTickets,
    checkedInAttendees,
    remainingTickets,
    remainingAttendees,
    cancelledTickets,
    refundedTickets,
    checkInPercent,
    recentCheckIns: recentRes.rows.map((r) => ({
      id: String(r.id),
      code: String(r.code),
      attendeeName: String(r.attendee_name || 'Guest'),
      ticketTypeName: String(r.ticket_type_name || r.ticket_label || 'Private Invitation'),
      acquisitionType: normalizeAcquisitionType(r),
      peopleCovered: Math.max(1, Number(r.people_covered || 1)),
      checkedInAt: r.checked_in_at,
      checkedInByName: String(r.checked_in_by_name || 'Staff'),
    })),
  }
}

interface RawTicketJoinRow {
  ticket_id: string
  ticket_code: string
  ticket_status: string
  ticket_source: string
  ticket_label: string | null
  acquisition_type: string | null
  people_covered: number | string | null
  purchaser_name: string | null
  attendee_name: string
  attendee_email: string | null
  checked_in_at: string | null
  checked_in_by_name: string | null
  event_id: string
  event_title: string
  event_organizer_id: string
  event_review_status: string | null
  event_check_in_status: string | null
  order_reference: string | null
  order_status: string | null
  ticket_type_name: string | null
}

function toSummary(
  row: RawTicketJoinRow,
  overrideStatus?: string,
  checkedInAt?: string | null,
  checkedInByName?: string | null,
): CheckInTicketSummary {
  const acquisitionType = normalizeAcquisitionType(row)
  return {
    id: String(row.ticket_id),
    code: String(row.ticket_code),
    attendeeName: String(row.attendee_name || 'Guest'),
    attendeeEmail: row.attendee_email || undefined,
    ticketTypeName: String(
      row.ticket_type_name ||
        row.ticket_label ||
        (acquisitionType === 'private-invitation' ? 'Private Free Invitation' : 'Standard Pass'),
    ),
    acquisitionType,
    peopleCovered: Math.max(1, Number(row.people_covered || 1)),
    purchaserName: row.purchaser_name || null,
    eventId: String(row.event_id),
    eventName: String(row.event_title || 'AZORTIX Event'),
    orderReference: String(row.order_reference || ''),
    source: String(row.ticket_source || 'purchase'),
    status: overrideStatus || String(row.ticket_status || 'valid'),
    checkedInAt: checkedInAt !== undefined ? checkedInAt : row.checked_in_at,
    checkedInByName: checkedInByName !== undefined ? checkedInByName : row.checked_in_by_name,
  }
}

function formatCheckInTimestamp(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.valueOf())) return ''
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(d)
}

export async function inspectTicketForAuthorizedStaff(params: {
  rawInput: string
  user: { id: string; email?: string; role?: string }
  expectedEventId?: string | null
}): Promise<CheckInValidationResponse> {
  const credential = extractTicketCredential(params.rawInput)
  if (!credential) {
    return {
      ok: false,
      code: 'INVALID_TICKET',
      headline: 'INVALID TICKET',
      message: 'INVALID TICKET — Ticket not found or verification failed.',
      httpStatus: 400,
    }
  }

  const pool = getPgPool(false)
  const tokenHash = hashVerificationToken(credential)
  const upperCode = credential.toUpperCase()

  const queryRes = await pool.query<RawTicketJoinRow>(
    `SELECT
       t."id" AS ticket_id,
       t."code" AS ticket_code,
       t."status"::text AS ticket_status,
       COALESCE(t."source"::text, 'purchase') AS ticket_source,
       t."ticket_label" AS ticket_label,
       t."acquisition_type" AS acquisition_type,
       COALESCE(t."people_covered", 1) AS people_covered,
       t."purchaser_name" AS purchaser_name,
       t."attendee_name" AS attendee_name,
       t."attendee_email" AS attendee_email,
       t."checked_in_at" AS checked_in_at,
       cb."name" AS checked_in_by_name,
       e."id" AS event_id,
       e."title" AS event_title,
       e."organizer_id" AS event_organizer_id,
       e."review_status"::text AS event_review_status,
       COALESCE(e."check_in_status"::text, 'closed') AS event_check_in_status,
       o."reference" AS order_reference,
       o."status"::text AS order_status,
       tt."name" AS ticket_type_name
     FROM "tickets" t
     JOIN "events" e ON e."id" = t."event_id"
     LEFT JOIN "orders" o ON o."id" = t."order_id"
     LEFT JOIN "ticket_types" tt ON tt."id" = t."ticket_type_id"
     LEFT JOIN "users" cb ON cb."id" = t."checked_in_by_id"
     WHERE t."verification_token_hash" = $1
        OR upper(t."code") = $2
     LIMIT 1`,
    [tokenHash, upperCode],
  )

  const row = queryRes.rows[0]
  if (!row) {
    return {
      ok: false,
      code: 'INVALID_TICKET',
      headline: 'INVALID TICKET',
      message: 'INVALID TICKET — Ticket not found or verification failed.',
      httpStatus: 404,
    }
  }

  const allowed = await canUserValidateEvent(pool, params.user, row.event_organizer_id, row.event_id)
  if (!allowed) {
    return {
      ok: false,
      code: 'WRONG_EVENT',
      headline: 'WRONG EVENT',
      message: 'WRONG EVENT — You are not assigned to validate tickets for this event.',
      httpStatus: 403,
    }
  }

  if (params.expectedEventId && String(params.expectedEventId) !== String(row.event_id)) {
    return {
      ok: false,
      code: 'WRONG_EVENT',
      headline: 'WRONG EVENT',
      message: 'WRONG EVENT — Ticket belongs to another event.',
      httpStatus: 409,
      ticket: toSummary(row),
    }
  }

  if (row.ticket_status === 'refunded' || row.order_status === 'refunded') {
    return {
      ok: false,
      code: 'REFUNDED_TICKET',
      headline: 'REFUNDED TICKET',
      message: 'REFUNDED TICKET — Entry denied.',
      httpStatus: 409,
      ticket: toSummary(row),
    }
  }

  if (
    row.ticket_status === 'cancelled' ||
    row.ticket_status === 'void' ||
    row.order_status === 'cancelled' ||
    row.event_review_status === 'cancelled'
  ) {
    return {
      ok: false,
      code: 'CANCELLED_TICKET',
      headline: 'CANCELLED TICKET',
      message: 'CANCELLED TICKET — Entry denied.',
      httpStatus: 409,
      ticket: toSummary(row),
    }
  }

  if (row.order_status !== 'paid') {
    return {
      ok: false,
      code: 'INVALID_TICKET',
      headline: 'INVALID TICKET',
      message: 'INVALID TICKET — Ticket payment has not been confirmed.',
      httpStatus: 409,
      ticket: toSummary(row),
    }
  }

  if (row.ticket_status === 'used') {
    const usedAt = formatCheckInTimestamp(row.checked_in_at)
    return {
      ok: false,
      code: 'ALREADY_USED',
      headline: 'ALREADY USED — ENTRY DENIED',
      message: usedAt
        ? `ALREADY USED — ENTRY DENIED. Originally scanned on ${usedAt}.`
        : 'ALREADY USED — ENTRY DENIED. This ticket has already been scanned.',
      httpStatus: 409,
      ticket: toSummary(row),
    }
  }

  if (row.event_check_in_status !== 'open') {
    return {
      ok: false,
      code: 'EVENT_NOT_OPEN',
      headline: 'EVENT NOT OPEN FOR CHECK-IN',
      message: 'EVENT NOT OPEN FOR CHECK-IN — Open check-in for this event before admitting guests.',
      httpStatus: 409,
      ticket: toSummary(row),
    }
  }

  return {
    ok: true,
    code: 'VALID_TICKET',
    headline: 'VALID TICKET — ENTRY APPROVED',
    message: 'VALID TICKET — Ready to confirm entry.',
    httpStatus: 200,
    ticket: toSummary(row),
  }
}

export async function validateAndCheckInTicket(params: {
  rawInput: string
  user: { id: string; name?: string; email?: string; role?: string }
  expectedEventId?: string | null
}): Promise<CheckInValidationResponse> {
  const credential = extractTicketCredential(params.rawInput)
  if (!credential) {
    return {
      ok: false,
      code: 'INVALID_TICKET',
      headline: 'INVALID TICKET',
      message: 'INVALID TICKET — Ticket not found or verification failed.',
      httpStatus: 400,
    }
  }

  const tokenHash = hashVerificationToken(credential)
  const upperCode = credential.toUpperCase()

  const pool = getPgPool(false)
  const lookup = await pool.query<{ id: string }>(
    `SELECT "id" FROM "tickets"
     WHERE "verification_token_hash" = $1 OR upper("code") = $2
     LIMIT 1`,
    [tokenHash, upperCode],
  )
  const ticketId = lookup.rows[0]?.id
  if (!ticketId) {
    return {
      ok: false,
      code: 'INVALID_TICKET',
      headline: 'INVALID TICKET',
      message: 'INVALID TICKET — Ticket not found or verification failed.',
      httpStatus: 404,
    }
  }

  return withTransactionLocked(`ticket-checkin:${ticketId}`, async (client) => {
    const lockedRes = await client.query<RawTicketJoinRow>(
      `SELECT
         t."id" AS ticket_id,
         t."code" AS ticket_code,
         t."status"::text AS ticket_status,
         COALESCE(t."source"::text, 'purchase') AS ticket_source,
         t."ticket_label" AS ticket_label,
         t."acquisition_type" AS acquisition_type,
         COALESCE(t."people_covered", 1) AS people_covered,
         t."purchaser_name" AS purchaser_name,
         t."attendee_name" AS attendee_name,
         t."attendee_email" AS attendee_email,
         t."checked_in_at" AS checked_in_at,
         cb."name" AS checked_in_by_name,
         e."id" AS event_id,
         e."title" AS event_title,
         e."organizer_id" AS event_organizer_id,
         e."review_status"::text AS event_review_status,
         COALESCE(e."check_in_status"::text, 'closed') AS event_check_in_status,
         o."reference" AS order_reference,
         o."status"::text AS order_status,
         tt."name" AS ticket_type_name
       FROM "tickets" t
       JOIN "events" e ON e."id" = t."event_id"
       LEFT JOIN "orders" o ON o."id" = t."order_id"
       LEFT JOIN "ticket_types" tt ON tt."id" = t."ticket_type_id"
       LEFT JOIN "users" cb ON cb."id" = t."checked_in_by_id"
       WHERE t."id" = $1
       FOR UPDATE OF t`,
      [ticketId],
    )

    const row = lockedRes.rows[0]
    if (!row) {
      return {
        ok: false,
        code: 'INVALID_TICKET',
        headline: 'INVALID TICKET',
        message: 'INVALID TICKET — Ticket not found or verification failed.',
        httpStatus: 404,
      }
    }

    const authorized = await canUserValidateEvent(
      client,
      params.user,
      row.event_organizer_id,
      row.event_id,
    )
    if (!authorized) {
      return {
        ok: false,
        code: 'WRONG_EVENT',
        headline: 'WRONG EVENT',
        message: 'WRONG EVENT — You are not assigned to check in tickets for this event.',
        httpStatus: 403,
      }
    }

    if (params.expectedEventId && String(params.expectedEventId) !== String(row.event_id)) {
      return {
        ok: false,
        code: 'WRONG_EVENT',
        headline: 'WRONG EVENT',
        message: 'WRONG EVENT — Ticket belongs to another event.',
        httpStatus: 409,
        ticket: toSummary(row),
      }
    }

    if (row.ticket_status === 'refunded' || row.order_status === 'refunded') {
      return {
        ok: false,
        code: 'REFUNDED_TICKET',
        headline: 'REFUNDED TICKET',
        message: 'REFUNDED TICKET — Entry denied.',
        httpStatus: 409,
        ticket: toSummary(row),
      }
    }

    if (
      row.ticket_status === 'cancelled' ||
      row.ticket_status === 'void' ||
      row.order_status === 'cancelled' ||
      row.event_review_status === 'cancelled'
    ) {
      return {
        ok: false,
        code: 'CANCELLED_TICKET',
        headline: 'CANCELLED TICKET',
        message: 'CANCELLED TICKET — Entry denied.',
        httpStatus: 409,
        ticket: toSummary(row),
      }
    }

    if (row.order_status !== 'paid') {
      return {
        ok: false,
        code: 'INVALID_TICKET',
        headline: 'INVALID TICKET',
        message: 'INVALID TICKET — Ticket payment has not been confirmed.',
        httpStatus: 409,
        ticket: toSummary(row),
      }
    }

    if (row.ticket_status === 'used') {
      const usedAt = formatCheckInTimestamp(row.checked_in_at)
      return {
        ok: false,
        code: 'ALREADY_USED',
        headline: 'ALREADY USED — ENTRY DENIED',
        message: usedAt
          ? `ALREADY USED — ENTRY DENIED. Originally checked in on ${usedAt}.`
          : 'ALREADY USED — ENTRY DENIED. This ticket has already been scanned.',
        httpStatus: 409,
        ticket: toSummary(row),
      }
    }

    if (row.event_check_in_status !== 'open') {
      return {
        ok: false,
        code: 'EVENT_NOT_OPEN',
        headline: 'EVENT NOT OPEN FOR CHECK-IN',
        message: 'EVENT NOT OPEN FOR CHECK-IN — Open check-in for this event before scanning tickets.',
        httpStatus: 409,
        ticket: toSummary(row),
      }
    }

    const updateRes = await client.query<{ checked_in_at: string }>(
      `UPDATE "tickets"
       SET "status" = 'used',
           "checked_in_at" = NOW(),
           "checked_in_by_id" = $2,
           "updated_at" = NOW()
       WHERE "id" = $1
         AND "status" = 'valid'
       RETURNING "checked_in_at"`,
      [row.ticket_id, params.user.id],
    )

    if (updateRes.rowCount !== 1) {
      return {
        ok: false,
        code: 'ALREADY_USED',
        headline: 'ALREADY USED — ENTRY DENIED',
        message: 'ALREADY USED — ENTRY DENIED. This ticket has already been scanned.',
        httpStatus: 409,
        ticket: toSummary(row, 'used'),
      }
    }

    const checkedInAt = updateRes.rows[0]?.checked_in_at || new Date().toISOString()
    return {
      ok: true,
      code: 'VALID_TICKET',
      headline: 'VALID TICKET — ENTRY APPROVED',
      message: 'VALID TICKET — ENTRY APPROVED.',
      httpStatus: 200,
      ticket: toSummary(row, 'used', checkedInAt, params.user.name || params.user.email || 'Staff'),
    }
  })
}

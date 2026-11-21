import 'server-only'
import { isEmailConfigured } from '@/lib/email'
import { resolveTimeZone } from '@/lib/format'
import { getPayloadClient, isTransientDbError } from '@/lib/payload'
import { isPaystackConfigured, listNigerianBanks } from '@/lib/paystack'
import { getPgPool } from '@/lib/postgres'
import {
  decryptVerificationToken,
  ensureTicketVerificationToken,
  getAssignedStaffEventsForUser,
  getTicketEnvironmentStatus,
} from '@/lib/tickets'
import type { Where } from 'payload'

const EMPTY_LIST = { docs: [], totalDocs: 0 }

async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [400, 1000]
  let lastError: unknown
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isTransientDbError(error) || attempt === delays.length) {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]))
    }
  }
  throw lastError
}

export async function getDashboardData(user: any) {
  return withDbRetry(() => loadDashboardData(user))
}

async function loadDashboardData(user: any) {
  const payload = await getPayloadClient()
  const staff = user.role === 'admin' || user.role === 'super-admin'
  const eventWhere: Where | undefined = staff ? undefined : { organizer: { equals: user.id } }

  const [events, bankDirectory] = await Promise.all([
    payload.find({
      collection: 'events',
      overrideAccess: false,
      user,
      where: eventWhere,
      limit: 100,
      depth: 1,
      draft: true,
      sort: '-createdAt',
    }),
    listNigerianBanks(),
  ])

  const ownedEventIds = (events.docs as any[]).map((ev) => ev.id).filter(Boolean)
  const skipEventScopedQueries = !staff && events.totalDocs === 0
  const relatedWhere: Where | undefined =
    !staff && ownedEventIds.length > 0 && events.totalDocs <= 100
      ? { event: { in: ownedEventIds } }
      : undefined
  const ownedContext = () =>
    !staff && events.totalDocs <= 100
      ? { __azorOwnedEventIdsByUser: new Map([[String(user.id), ownedEventIds]]) }
      : undefined

  const [ticketTypes, orders, tickets, payouts] = await Promise.all([
    skipEventScopedQueries
      ? Promise.resolve(EMPTY_LIST)
      : payload.find({
          collection: 'ticket-types',
          overrideAccess: false,
          user,
          context: ownedContext(),
          where: relatedWhere,
          limit: 200,
          depth: 0,
          sort: 'price',
        }),
    skipEventScopedQueries
      ? Promise.resolve(EMPTY_LIST)
      : payload.find({
          collection: 'orders',
          overrideAccess: false,
          user,
          context: ownedContext(),
          where: relatedWhere,
          limit: 200,
          depth: 1,
          sort: '-createdAt',
        }),
    skipEventScopedQueries
      ? Promise.resolve(EMPTY_LIST)
      : payload.find({
          collection: 'tickets',
          overrideAccess: false,
          user,
          context: ownedContext(),
          where: relatedWhere,
          limit: 200,
          depth: 1,
          sort: '-createdAt',
        }),
    payload.find({
      collection: 'payout-requests',
      overrideAccess: false,
      user,
      where: staff ? {} : { organizer: { equals: user.id } },
      limit: 100,
      depth: 1,
      sort: '-createdAt',
    }),
  ])

  const [team, complaints, users, settings] = await Promise.all([
    payload.find({
      collection: 'team-memberships',
      overrideAccess: false,
      user,
      where: staff ? {} : { organizer: { equals: user.id } },
      limit: 100,
      depth: 0,
    }),
    staff
      ? payload.find({
          collection: 'complaints',
          overrideAccess: false,
          user,
          limit: 100,
          depth: 0,
          sort: '-createdAt',
        })
      : Promise.resolve(EMPTY_LIST),
    staff
      ? payload.find({
          collection: 'users',
          overrideAccess: false,
          user,
          limit: 200,
          depth: 0,
          sort: '-createdAt',
        })
      : Promise.resolve(EMPTY_LIST),
    staff
      ? payload.findGlobal({ slug: 'platform-settings', overrideAccess: false, user })
      : Promise.resolve(null),
  ])

  const [profiles, discounts, guests, announcements] = await Promise.all([
    payload.find({
      collection: 'organizer-profiles',
      overrideAccess: false,
      user,
      where: staff ? {} : { owner: { equals: user.id } },
      limit: 10,
      depth: 1,
    }),
    skipEventScopedQueries
      ? Promise.resolve(EMPTY_LIST)
      : payload.find({
          collection: 'discounts',
          overrideAccess: false,
          user,
          context: ownedContext(),
          where: relatedWhere,
          limit: 100,
          depth: 0,
          sort: '-createdAt',
        }),
    skipEventScopedQueries
      ? Promise.resolve(EMPTY_LIST)
      : payload.find({
          collection: 'guest-list-entries',
          overrideAccess: false,
          user,
          context: ownedContext(),
          where: relatedWhere,
          limit: 100,
          depth: 0,
          sort: '-createdAt',
        }),
    skipEventScopedQueries
      ? Promise.resolve(EMPTY_LIST)
      : payload.find({
          collection: 'announcements',
          overrideAccess: false,
          user,
          context: ownedContext(),
          where: relatedWhere,
          limit: 100,
          depth: 0,
          sort: '-createdAt',
        }),
  ])

  const [collections, bank, bankAppeals, freeLinks] = await Promise.all([
    payload.find({
      collection: 'event-collections',
      overrideAccess: false,
      user,
      where: staff ? {} : { organizer: { equals: user.id } },
      limit: 100,
      depth: 1,
    }),
    payload.find({
      collection: 'bank-verifications',
      overrideAccess: true,
      where: staff ? {} : { organizer: { equals: user.id } },
      limit: 100,
      depth: 1,
    }),
    payload.find({
      collection: 'bank-change-appeals' as any,
      overrideAccess: true,
      where: staff ? {} : { organizer: { equals: user.id } },
      limit: 100,
      depth: 1,
      sort: '-createdAt',
    }),
    payload.find({
      collection: 'free-ticket-links' as any,
      overrideAccess: true,
      where: staff ? {} : { organizer: { equals: user.id } },
      limit: 200,
      depth: 1,
      sort: '-createdAt',
    }),
  ])

  const [auditLogs, transactions, refunds] = await Promise.all([
    staff
      ? payload.find({
          collection: 'audit-logs' as any,
          overrideAccess: true,
          limit: 100,
          depth: 0,
          sort: '-createdAt',
        })
      : Promise.resolve(EMPTY_LIST),
    skipEventScopedQueries
      ? Promise.resolve(EMPTY_LIST)
      : payload.find({
          collection: 'transactions',
          overrideAccess: false,
          user,
          context: ownedContext(),
          where: relatedWhere,
          limit: 100,
          depth: 0,
          sort: '-createdAt',
        }),
    skipEventScopedQueries
      ? Promise.resolve(EMPTY_LIST)
      : payload.find({
          collection: 'refunds',
          overrideAccess: false,
          user,
          context: ownedContext(),
          where: relatedWhere,
          limit: 100,
          depth: 0,
          sort: '-createdAt',
        }),
  ])

  const paidOrders = orders.docs.filter((order: any) => order.status === 'paid')
  const freeOrders = paidOrders.filter(
    (order: any) => order.orderKind === 'free' || Number(order.total || 0) === 0,
  )
  const revenueOrders = paidOrders.filter(
    (order: any) => order.orderKind !== 'free' && Number(order.total || 0) > 0,
  )
  const freeTickets = tickets.docs.filter(
    (ticket: any) =>
      ticket.source === 'free-registration' ||
      ticket.source === 'free-claim' ||
      ticket.source === 'guest-list',
  )
  const paidTickets = tickets.docs.filter((ticket: any) => ticket.source === 'purchase')
  const grossRevenue = paidOrders.reduce(
    (sum: number, order: any) => sum + Number(order.subtotal || 0),
    0,
  )
  const checkedIn = tickets.docs.filter((ticket: any) => ticket.status === 'used').length
  const platformCommission = paidOrders.reduce(
    (sum: number, order: any) =>
      sum + Number(order.commissionAmount ?? Math.round(Number(order.subtotal || 0) * 0.05)),
    0,
  )
  const organizerEarnings = paidOrders.reduce(
    (sum: number, order: any) =>
      sum + Number(order.organizerEarnings ?? Math.round(Number(order.subtotal || 0) * 0.95)),
    0,
  )
  const pendingAppealsCount = bankAppeals.docs.filter(
    (appeal: any) => appeal.status === 'pending',
  ).length

  const bankByOrganizer = new Map<string, any>()
  for (const b of bank.docs as any[]) {
    const orgId = typeof b.organizer === 'object' ? b.organizer?.id : b.organizer
    if (orgId) bankByOrganizer.set(String(orgId), b)
  }

  const eventBalances = (events.docs as any[]).map((ev) => {
    const evId = String(ev.id)
    const orgId = String(typeof ev.organizer === 'object' ? ev.organizer?.id : ev.organizer)
    const evEarnings = paidOrders
      .filter((o: any) => String(typeof o.event === 'object' ? o.event?.id : o.event) === evId)
      .reduce(
        (sum: number, o: any) =>
          sum + Number(o.organizerEarnings ?? Math.round(Number(o.subtotal || 0) * 0.95)),
        0,
      )
    const evReserved = (payouts.docs as any[])
      .filter(
        (p: any) =>
          String(typeof p.event === 'object' ? p.event?.id : p.event) === evId &&
          ['pending', 'processing', 'approved', 'paid'].includes(p.status),
      )
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    const orgBank = bankByOrganizer.get(orgId)
    return {
      eventId: evId,
      title: ev.title,
      organizerId: orgId,
      earnings: evEarnings,
      reserved: evReserved,
      available: Math.max(0, evEarnings - evReserved),
      bankVerified: Boolean(orgBank && orgBank.status === 'verified' && orgBank.locked),
      bankName: orgBank?.bankName || '',
      accountNumber: orgBank?.accountNumber || '',
      accountName: orgBank?.accountName || '',
    }
  })

  // Compute live sold counts per ticket type, staff assigned events, and personal buyer/recipient tickets/orders
  const pool = getPgPool(false)
  const ticketTypeDocs = ticketTypes.docs as any[]
  const ticketTypeIds = ticketTypeDocs.map((t) => t.id).filter(Boolean)

  const [soldRowsRes, assignedStaffEvents, myTicketsRes, myOrdersRes] = await Promise.all([
    ticketTypeIds.length > 0
      ? pool.query<{ ticket_type_id: string; sold: string }>(
          `SELECT "ticket_type_id", COUNT(*)::text AS sold
           FROM "tickets"
           WHERE "ticket_type_id" = ANY($1)
             AND COALESCE("status"::text, 'valid') NOT IN ('void', 'refunded')
           GROUP BY "ticket_type_id"`,
          [ticketTypeIds],
        )
      : Promise.resolve({ rows: [] as Array<{ ticket_type_id: string; sold: string }> }),
    getAssignedStaffEventsForUser({ id: String(user.id), email: user.email, role: user.role }),
    user.email
      ? pool.query<{
          id: string
          code: string
          status: string | null
          source: string | null
          acquisition_type: string | null
          ticket_label: string | null
          attendee_name: string | null
          attendee_email: string | null
          purchaser_name: string | null
          purchaser_email: string | null
          purchaser_user_id: string | null
          gift_message: string | null
          people_covered: number | null
          email_delivery_status: string | null
          email_last_error: string | null
          email_attempts: number | null
          checked_in_at: string | null
          created_at: string
          verification_token_ciphertext: string | null
          event_id: string
          event_title: string | null
          event_slug: string | null
          event_starts_at: string | null
          event_venue: string | null
          ticket_type_name: string | null
          order_reference: string | null
          order_total: number | null
          order_purchase_mode: string | null
        }>(
          `SELECT t."id", t."code", t."status"::text AS status, t."source"::text AS source,
                  t."acquisition_type", t."ticket_label",
                  t."attendee_name", t."attendee_email",
                  t."purchaser_name", t."purchaser_email", t."purchaser_user_id",
                  t."gift_message", t."people_covered",
                  t."email_delivery_status", t."email_last_error", t."email_attempts",
                  t."checked_in_at", t."created_at", t."verification_token_ciphertext",
                  t."event_id",
                  e."title" AS event_title, e."slug" AS event_slug, e."starts_at" AS event_starts_at, e."venue" AS event_venue,
                  tt."name" AS ticket_type_name,
                  o."reference" AS order_reference, o."total" AS order_total, o."purchase_mode" AS order_purchase_mode
           FROM "tickets" t
           LEFT JOIN "events" e ON e."id" = t."event_id"
           LEFT JOIN "ticket_types" tt ON tt."id" = t."ticket_type_id"
           LEFT JOIN "orders" o ON o."id" = t."order_id"
           WHERE t."purchaser_user_id" = $1
              OR lower(COALESCE(t."purchaser_email", '')) = lower($2)
              OR lower(COALESCE(t."attendee_email", '')) = lower($2)
           ORDER BY t."created_at" DESC
           LIMIT 200`,
          [user.id, user.email],
        )
      : Promise.resolve({ rows: [] as any[] }),
    user.email
      ? pool.query<{
          id: string
          reference: string
          order_kind: string | null
          purchase_mode: string | null
          status: string | null
          subtotal: number | null
          fees: number | null
          total: number | null
          created_at: string
          paid_at: string | null
          email_delivery_status: string | null
          event_title: string | null
          event_slug: string | null
          event_starts_at: string | null
        }>(
          `SELECT o."id", o."reference", o."order_kind"::text AS order_kind, o."purchase_mode",
                  o."status"::text AS status, o."subtotal", o."fees", o."total",
                  o."created_at", o."paid_at", o."email_delivery_status",
                  e."title" AS event_title, e."slug" AS event_slug, e."starts_at" AS event_starts_at
           FROM "orders" o
           LEFT JOIN "events" e ON e."id" = o."event_id"
           WHERE o."purchaser_user_id" = $1
              OR lower(COALESCE(o."customer_email", '')) = lower($2)
           ORDER BY o."created_at" DESC
           LIMIT 100`,
          [user.id, user.email],
        )
      : Promise.resolve({ rows: [] as any[] }),
  ])

  const soldByTicketTypeId = new Map<string, number>(
    soldRowsRes.rows.map((r) => [String(r.ticket_type_id), Number(r.sold || 0)]),
  )
  const enrichedTicketTypes = ticketTypeDocs.map((tt) => {
    const sold = soldByTicketTypeId.get(String(tt.id)) || 0
    const quantity = Number(tt.quantity || 0)
    return {
      ...tt,
      sold,
      remaining: Math.max(0, quantity - sold),
    }
  })

  // Attach token-protected sharePath & pdfDownloadPath to dashboard tickets in a single batched Postgres query (zero N+1)
  const ticketDocs = tickets.docs as any[]
  const sharePathByTicketId = new Map<string, { sharePath: string; pdfDownloadPath: string }>()
  if (ticketDocs.length > 0) {
    const ticketIds = ticketDocs.map((t) => t.id)
    const tokenRows = await pool.query<{
      id: string
      verification_token_ciphertext: string | null
    }>(
      'SELECT "id", "verification_token_ciphertext" FROM "tickets" WHERE "id" = ANY($1)',
      [ticketIds],
    )
    const cipherMap = new Map(
      tokenRows.rows.map((r) => [String(r.id), r.verification_token_ciphertext]),
    )
    for (const t of ticketDocs) {
      const idStr = String(t.id)
      let rawToken = decryptVerificationToken(cipherMap.get(idStr))
      if (!rawToken) {
        rawToken = await ensureTicketVerificationToken(idStr, cipherMap.get(idStr))
      }
      const encoded = encodeURIComponent(rawToken)
      sharePathByTicketId.set(idStr, {
        sharePath: `/tickets/${encoded}`,
        pdfDownloadPath: `/api/tickets/${encoded}/pdf`,
      })
    }
  }
  const enrichedTickets = ticketDocs.map((t) => {
    const paths = sharePathByTicketId.get(String(t.id))
    return {
      ...t,
      sharePath: paths?.sharePath || `/tickets/${t.code}`,
      pdfDownloadPath: paths?.pdfDownloadPath || `/api/tickets/${t.code}/pdf`,
    }
  })

  const userEmailLower = String(user.email || '').toLowerCase()
  const myTicketsFormatted = await Promise.all(
    myTicketsRes.rows.map(async (row) => {
      let rawToken = decryptVerificationToken(row.verification_token_ciphertext)
      if (!rawToken) {
        rawToken = await ensureTicketVerificationToken(
          String(row.id),
          row.verification_token_ciphertext,
        )
      }
      const encoded = encodeURIComponent(rawToken)
      const isAttendee = String(row.attendee_email || '').toLowerCase() === userEmailLower
      const isPurchaser =
        String(row.purchaser_user_id || '') === String(user.id) ||
        String(row.purchaser_email || '').toLowerCase() === userEmailLower
      const isGift = row.acquisition_type === 'gift' || row.order_purchase_mode === 'gift'
      return {
        id: String(row.id),
        code: row.code,
        status: row.status || 'valid',
        source: row.source || 'purchase',
        acquisitionType:
          row.acquisition_type ||
          (isGift
            ? 'gift'
            : row.source === 'free-claim'
              ? 'private-invitation'
              : row.source === 'guest-list'
                ? 'complimentary'
                : row.source === 'free-registration'
                  ? 'public-free'
                  : 'self-purchase'),
        ticketLabel: row.ticket_label || row.ticket_type_name || 'Event Pass',
        attendeeName: row.attendee_name || '',
        attendeeEmail: row.attendee_email || '',
        purchaserName: row.purchaser_name || '',
        purchaserEmail: row.purchaser_email || '',
        giftMessage: row.gift_message || '',
        peopleCovered: Number(row.people_covered || 1),
        emailDeliveryStatus: row.email_delivery_status || 'pending',
        emailLastError: row.email_last_error || '',
        emailAttempts: Number(row.email_attempts || 0),
        checkedInAt: row.checked_in_at || null,
        createdAt: row.created_at,
        eventId: String(row.event_id),
        eventTitle: row.event_title || 'Event',
        eventSlug: row.event_slug || '',
        eventStartsAt: row.event_starts_at || null,
        eventVenue: row.event_venue || '',
        orderReference: row.order_reference || '',
        orderTotal: Number(row.order_total || 0),
        isAttendee,
        isPurchaser,
        isGift,
        sharePath: `/tickets/${encoded}`,
        pdfDownloadPath: `/api/tickets/${encoded}/pdf`,
      }
    }),
  )

  const myGiftPurchases = myTicketsFormatted.filter((t) => t.isPurchaser && t.isGift && !t.isAttendee)
  const myReceivedTickets = myTicketsFormatted.filter((t) => t.isAttendee)

  // Merge organizer/admin events with assigned check-in staff events for the scanner
  const scannerEventMap = new Map<
    string,
    {
      id: string
      title: string
      startsAt?: string | null
      timezone?: string
      venue?: string
      address?: string
      checkInStatus: 'open' | 'closed'
      canManageCheckInStatus: boolean
    }
  >()
  for (const ev of events.docs as any[]) {
    scannerEventMap.set(String(ev.id), {
      id: String(ev.id),
      title: String(ev.title || 'Untitled event'),
      startsAt: ev.startsAt || null,
      timezone: resolveTimeZone(ev.timezone),
      venue: ev.venue || '',
      address: ev.address || '',
      checkInStatus: ev.checkInStatus === 'open' ? 'open' : 'closed',
      canManageCheckInStatus: true,
    })
  }
  for (const ev of assignedStaffEvents) {
    if (!scannerEventMap.has(ev.id)) {
      scannerEventMap.set(ev.id, {
        id: ev.id,
        title: ev.title,
        startsAt: ev.startsAt,
        timezone: resolveTimeZone((ev as any).timezone),
        venue: ev.venue,
        address: ev.address,
        checkInStatus: ev.checkInStatus,
        canManageCheckInStatus: false,
      })
    }
  }
  const scannerEvents = Array.from(scannerEventMap.values())

  const giftTicketsCount = tickets.docs.filter(
    (ticket: any) => ticket.acquisitionType === 'gift',
  ).length
  const invitationTicketsCount = tickets.docs.filter(
    (ticket: any) =>
      ticket.acquisitionType === 'private-invitation' || ticket.source === 'free-claim',
  ).length

  return JSON.parse(
    JSON.stringify({
      serverTimeMs: Date.now(),
      capabilities: {
        paystackConfigured: isPaystackConfigured(),
        emailConfigured: isEmailConfigured(),
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
        ticketEnv: getTicketEnvironmentStatus(),
      },
      banks: bankDirectory.banks,
      eventBalances,
      metrics: {
        checkedIn,
        events: events.totalDocs,
        grossRevenue,
        organizerEarnings,
        platformCommission,
        orders: paidOrders.length,
        paidOrdersCount: revenueOrders.length,
        freeRegistrationsCount: freeOrders.length,
        paidTicketsCount: paidTickets.length,
        freeTicketsCount: freeTickets.length,
        giftTicketsCount,
        invitationTicketsCount,
        tickets: tickets.totalDocs,
        pendingAppealsCount,
      },
      events: events.docs,
      scannerEvents,
      assignedStaffEvents,
      ticketTypes: enrichedTicketTypes,
      orders: orders.docs,
      tickets: enrichedTickets,
      myTickets: myReceivedTickets,
      myGiftPurchases,
      myOrders: myOrdersRes.rows.map((o) => ({
        id: String(o.id),
        reference: o.reference,
        orderKind: o.order_kind || 'paid',
        purchaseMode: o.purchase_mode || 'self',
        status: o.status || 'pending',
        subtotal: Number(o.subtotal || 0),
        fees: Number(o.fees || 0),
        total: Number(o.total || 0),
        createdAt: o.created_at,
        paidAt: o.paid_at,
        emailDeliveryStatus: o.email_delivery_status || 'pending',
        eventTitle: o.event_title || 'Event',
        eventSlug: o.event_slug || '',
        eventStartsAt: o.event_starts_at || null,
      })),
      payouts: payouts.docs,
      team: team.docs,
      complaints: complaints.docs,
      users: users.docs,
      settings,
      profile: profiles.docs[0] || null,
      discounts: discounts.docs,
      guests: guests.docs,
      announcements: announcements.docs,
      collections: collections.docs,
      bank: bank.docs[0] || null,
      bankVerifications: bank.docs,
      bankAppeals: bankAppeals.docs,
      freeTicketLinks: freeLinks.docs,
      auditLogs: auditLogs.docs,
      transactions: transactions.docs,
      refunds: refunds.docs,
    }),
  )
}

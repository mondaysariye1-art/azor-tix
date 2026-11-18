import 'server-only'
import { getPayloadClient } from '@/lib/payload'
import type { Where } from 'payload'

export async function getDashboardData(user: any) {
  const payload = await getPayloadClient()
  const staff = user.role === 'admin' || user.role === 'super-admin'
  const eventWhere: Where | undefined = staff ? undefined : { organizer: { equals: user.id } }
  const relatedWhere: Where | undefined = staff
    ? undefined
    : { 'event.organizer': { equals: user.id } }

  const [events, ticketTypes, orders, tickets, payouts, team, complaints, users, settings] =
    await Promise.all([
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
      payload.find({
        collection: 'ticket-types',
        overrideAccess: false,
        user,
        where: relatedWhere,
        limit: 200,
        depth: 0,
        sort: 'price',
      }),
      payload.find({
        collection: 'orders',
        overrideAccess: false,
        user,
        where: relatedWhere,
        limit: 100,
        depth: 2,
        sort: '-createdAt',
      }),
      payload.find({
        collection: 'tickets',
        overrideAccess: false,
        user,
        where: relatedWhere,
        limit: 100,
        depth: 2,
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
        : Promise.resolve({ docs: [] }),
      staff
        ? payload.find({
            collection: 'users',
            overrideAccess: false,
            user,
            limit: 100,
            depth: 0,
            sort: '-createdAt',
          })
        : Promise.resolve({ docs: [] }),
      staff
        ? payload.findGlobal({ slug: 'platform-settings', overrideAccess: false, user })
        : Promise.resolve(null),
    ])

  const [profiles, discounts, guests, announcements, collections, bank, transactions, refunds] =
    await Promise.all([
      payload.find({
        collection: 'organizer-profiles',
        overrideAccess: false,
        user,
        where: staff ? {} : { owner: { equals: user.id } },
        limit: 10,
        depth: 1,
      }),
      payload.find({
        collection: 'discounts',
        overrideAccess: false,
        user,
        where: relatedWhere,
        limit: 100,
        depth: 1,
        sort: '-createdAt',
      }),
      payload.find({
        collection: 'guest-list-entries',
        overrideAccess: false,
        user,
        where: relatedWhere,
        limit: 100,
        depth: 1,
        sort: '-createdAt',
      }),
      payload.find({
        collection: 'announcements',
        overrideAccess: false,
        user,
        where: relatedWhere,
        limit: 100,
        depth: 1,
        sort: '-createdAt',
      }),
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
        overrideAccess: false,
        user,
        where: staff ? {} : { organizer: { equals: user.id } },
        limit: 100,
        depth: 0,
      }),
      payload.find({
        collection: 'transactions',
        overrideAccess: false,
        user,
        where: relatedWhere,
        limit: 100,
        depth: 1,
        sort: '-createdAt',
      }),
      payload.find({
        collection: 'refunds',
        overrideAccess: false,
        user,
        where: relatedWhere,
        limit: 100,
        depth: 1,
        sort: '-createdAt',
      }),
    ])

  const paidOrders = orders.docs.filter((order: any) => order.status === 'paid')
  const grossRevenue = paidOrders.reduce(
    (sum: number, order: any) => sum + Number(order.subtotal),
    0,
  )
  const checkedIn = tickets.docs.filter((ticket: any) => ticket.status === 'used').length
  const platformCommission = paidOrders.reduce(
    (sum: number, order: any) =>
      sum + Number(order.commissionAmount ?? Math.round(Number(order.subtotal) * 0.05)),
    0,
  )
  const organizerEarnings = paidOrders.reduce(
    (sum: number, order: any) =>
      sum + Number(order.organizerEarnings ?? Math.round(Number(order.subtotal) * 0.95)),
    0,
  )

  return JSON.parse(
    JSON.stringify({
      metrics: {
        checkedIn,
        events: events.totalDocs,
        grossRevenue,
        organizerEarnings,
        platformCommission,
        orders: paidOrders.length,
        tickets: tickets.totalDocs,
      },
      events: events.docs,
      ticketTypes: ticketTypes.docs,
      orders: orders.docs,
      tickets: tickets.docs,
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
      transactions: transactions.docs,
      refunds: refunds.docs,
    }),
  )
}

import { requireActiveDashboardUser } from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { getPayloadClient } from '@/lib/payload'
import { getPgPool } from '@/lib/postgres'

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser(['organizer', 'admin', 'super-admin'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const user = auth.user

  try {
    const contentType = request.headers.get('content-type') || ''
    let body: Record<string, any> = {}
    if (contentType.includes('application/json')) {
      body = (await request.json().catch(() => ({}))) as Record<string, any>
    } else {
      const form = await request.formData()
      for (const [k, v] of form.entries()) {
        body[k] = typeof v === 'string' ? v : ''
      }
    }

    const action = String(body.action || 'create').trim()
    const payload = await getPayloadClient()

    if (action === 'toggle' || action === 'update' || action === 'delete') {
      const ticketTypeId = String(body.ticketTypeId || '').trim()
      if (!ticketTypeId) {
        return Response.json({ error: 'Missing ticket category ID.' }, { status: 400 })
      }
      const existing: any = await payload
        .findByID({
          collection: 'ticket-types',
          id: ticketTypeId,
          overrideAccess: false,
          user,
          depth: 0,
        })
        .catch(() => null)
      if (!existing) {
        return Response.json({ error: 'Ticket category not found.' }, { status: 404 })
      }

      if (action === 'toggle') {
        const nextActive =
          body.active !== undefined
            ? String(body.active) === 'true'
            : !Boolean(existing.active)
        const nextSalesStatus = nextActive ? 'active' : 'paused'
        await payload.update({
          collection: 'ticket-types',
          id: ticketTypeId,
          overrideAccess: false,
          user,
          data: {
            active: nextActive,
            salesStatus: nextSalesStatus,
          },
        })
        await logAudit({
          payload,
          action: nextActive ? 'ticket_type.enabled' : 'ticket_type.paused',
          category: 'ticket',
          actor: user as any,
          targetCollection: 'ticket-types',
          targetId: ticketTypeId,
          summary: `${nextActive ? 'Enabled' : 'Paused'} ticket category "${existing.name}".`,
        })
        return Response.json({
          message: `Ticket category "${existing.name}" is now ${nextActive ? 'active' : 'paused'}.`,
        })
      }

      if (action === 'delete') {
        const pool = getPgPool(false)
        const refs = await pool.query<{ tickets: number; orders: number }>(
          `SELECT
             (SELECT COUNT(*)::int FROM "tickets" WHERE "ticket_type_id" = $1::uuid) AS tickets,
             (SELECT COUNT(*)::int FROM "orders_items" WHERE "ticket_type_id" = $1::uuid) AS orders`,
          [ticketTypeId],
        )
        const counts = refs.rows[0] || { tickets: 0, orders: 0 }
        if (counts.tickets > 0 || counts.orders > 0) {
          await payload.update({
            collection: 'ticket-types',
            id: ticketTypeId,
            overrideAccess: false,
            user,
            data: { active: false, salesStatus: 'paused' },
          })
          return Response.json({
            message: `"${existing.name}" already has issued tickets or orders, so it was paused instead of deleted to protect customer records.`,
          })
        }
        await payload.delete({
          collection: 'ticket-types',
          id: ticketTypeId,
          overrideAccess: false,
          user,
        })
        await logAudit({
          payload,
          action: 'ticket_type.deleted',
          category: 'ticket',
          actor: user as any,
          targetCollection: 'ticket-types',
          targetId: ticketTypeId,
          summary: `Deleted unused ticket category "${existing.name}".`,
        })
        return Response.json({ message: `Ticket category "${existing.name}" deleted.` })
      }

      // action === 'update'
      const name = body.name !== undefined ? String(body.name).trim() : String(existing.name)
      const description =
        body.description !== undefined ? String(body.description).trim() : String(existing.description || '')
      const rawKind = String(body.ticketKind || existing.ticketKind || 'paid').trim()
      const rawPrice = body.price !== undefined ? Number(body.price) : Number(existing.price)
      const ticketKind = rawKind === 'free' || rawPrice === 0 ? 'free' : 'paid'
      const price = ticketKind === 'free' ? 0 : rawPrice
      const quantity = body.quantity !== undefined ? Number(body.quantity) : Number(existing.quantity)
      const minPerOrder = Math.max(1, Number(body.minPerOrder ?? existing.minPerOrder ?? 1))
      const maxPerOrder = Math.max(
        minPerOrder,
        Number(body.maxPerOrder ?? existing.maxPerOrder ?? (ticketKind === 'free' ? 4 : 8)),
      )
      const salesOpenAt =
        body.salesOpenAt !== undefined
          ? String(body.salesOpenAt).trim() || null
          : existing.salesOpenAt || null
      const salesCloseAt =
        body.salesCloseAt !== undefined
          ? String(body.salesCloseAt).trim() || null
          : existing.salesCloseAt || null
      const ticketMode = body.ticketMode === 'group' ? 'group' : 'single'
      const groupSize = ticketMode === 'group' ? Math.max(2, Number(body.groupSize || 2)) : 1

      if (name.length < 2 || !Number.isInteger(quantity) || quantity < 1) {
        return Response.json({ error: 'Enter a valid ticket category name and quantity.' }, { status: 400 })
      }
      if (ticketKind === 'paid' && (!Number.isFinite(price) || price <= 0)) {
        return Response.json(
          { error: 'Paid ticket price must be greater than ₦0, or select Free Ticket.' },
          { status: 400 },
        )
      }

      const pool = getPgPool(false)
      const soldRes = await pool.query<{ sold: number }>(
        `SELECT COUNT(*)::int AS sold FROM "tickets"
         WHERE "ticket_type_id" = $1::uuid AND "status"::text NOT IN ('refunded', 'void', 'cancelled')`,
        [ticketTypeId],
      )
      const alreadySold = soldRes.rows[0]?.sold || 0
      if (quantity < alreadySold) {
        return Response.json(
          {
            error: `Quantity cannot be reduced below ${alreadySold} because ${alreadySold} ticket(s) have already been sold.`,
          },
          { status: 409 },
        )
      }

      await payload.update({
        collection: 'ticket-types',
        id: ticketTypeId,
        overrideAccess: false,
        user,
        data: {
          name,
          description,
          ticketKind,
          price,
          quantity,
          minPerOrder,
          maxPerOrder,
          salesOpenAt: salesOpenAt || undefined,
          salesCloseAt: salesCloseAt || undefined,
          ticketMode,
          groupSize,
        } as any,
      })

      await logAudit({
        payload,
        action: 'ticket_type.updated',
        category: 'ticket',
        actor: user as any,
        targetCollection: 'ticket-types',
        targetId: ticketTypeId,
        summary: `Updated ticket category "${name}" (₦${price}, qty ${quantity}).`,
      })

      return Response.json({ message: `Ticket category "${name}" updated.` })
    }

    // Default: create
    const event = String(body.eventId || '').trim()
    const name = String(body.name || '').trim()
    const description = String(body.description || '').trim()
    const rawKind = String(body.ticketKind || '').trim()
    const rawPrice = Number(body.price)
    const ticketKind = rawKind === 'free' || rawPrice === 0 ? 'free' : 'paid'
    const price = ticketKind === 'free' ? 0 : rawPrice
    const quantity = Number(body.quantity)
    const minPerOrder = Math.max(1, Number(body.minPerOrder || 1))
    const maxPerOrder = Math.max(
      minPerOrder,
      Number(body.maxPerOrder || (ticketKind === 'free' ? Math.min(4, quantity) : 8)),
    )
    const salesOpenAt = String(body.salesOpenAt || '').trim() || undefined
    const salesCloseAt = String(body.salesCloseAt || '').trim() || undefined
    const ticketMode = body.ticketMode === 'group' ? 'group' : 'single'
    const groupSize = ticketMode === 'group' ? Math.max(2, Number(body.groupSize || 2)) : 1

    if (!event || name.length < 2 || !Number.isInteger(quantity) || quantity < 1) {
      return Response.json({ error: 'Enter valid ticket name and quantity.' }, { status: 400 })
    }
    if (ticketKind === 'paid' && (!Number.isFinite(price) || price <= 0)) {
      return Response.json(
        { error: 'Paid ticket price must be greater than ₦0, or select Free Ticket.' },
        { status: 400 },
      )
    }

    const created = await payload.create({
      collection: 'ticket-types',
      overrideAccess: false,
      user,
      data: {
        event,
        name,
        ticketKind,
        description,
        price,
        quantity,
        minPerOrder,
        maxPerOrder,
        salesOpenAt,
        salesCloseAt,
        ticketMode,
        groupSize,
        visibility: 'public',
        salesStatus: 'active',
        active: true,
      } as any,
    })

    await logAudit({
      payload,
      action: 'ticket_type.created',
      category: 'ticket',
      actor: user as any,
      targetCollection: 'ticket-types',
      targetId: created.id,
      summary: `Created ${ticketKind} ticket category "${name}" (qty ${quantity}, ₦${price}) for event ${event}.`,
    })

    return Response.json({
      ticketType: created,
      message:
        ticketKind === 'free'
          ? `Free ticket category "${name}" (${quantity} tickets) added.`
          : `Ticket category "${name}" added.`,
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to manage ticket category.' },
      { status: 400 },
    )
  }
}

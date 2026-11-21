import { requireActiveDashboardUser } from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { sendTransactionalEmail } from '@/lib/email'
import { slugifyEventTitle } from '@/lib/event-slugs'
import { getPayloadClient } from '@/lib/payload'
import { resolvePublicOrigin } from '@/lib/paystack'

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser(['organizer', 'admin', 'super-admin'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const user = auth.user

  const form = await request.formData()
  const eventId = String(form.get('eventId') || '')
  const publishParam = form.get('publish')
  const requestedReviewStatus = String(form.get('reviewStatus') || '').trim()
  const isStaff = user.role === 'admin' || user.role === 'super-admin'
  if (
    !isStaff &&
    requestedReviewStatus &&
    ['approved', 'rejected', 'cancelled'].includes(requestedReviewStatus)
  ) {
    return Response.json(
      { error: 'Only AZORTIX Admins and Super Admins can approve or change event approval status.' },
      { status: 403 },
    )
  }
  if (!eventId) {
    return Response.json({ error: 'Missing event ID.' }, { status: 400 })
  }
  const payload = await getPayloadClient()

  try {
    const existing: any = await payload.findByID({
      collection: 'events',
      overrideAccess: false,
      user,
      id: eventId,
      draft: true,
      depth: 0,
    })

    const title = form.has('title') ? String(form.get('title') || '').trim() : existing.title
    const venue = form.has('venue') ? String(form.get('venue') || '').trim() : existing.venue
    const capacity = form.has('capacity')
      ? Number(form.get('capacity'))
      : Number(existing.capacity)
    const checkInStatus = form.has('checkInStatus')
      ? form.get('checkInStatus') === 'open'
        ? 'open'
        : 'closed'
      : existing.checkInStatus || 'closed'
    const rawSlug = form.has('slug') ? String(form.get('slug') || '').trim() : ''
    const nextSlug = rawSlug ? slugifyEventTitle(rawSlug) : undefined

    const isAlreadyApproved = existing.reviewStatus === 'approved'
    const wantsLivePublish =
      publishParam === 'true'
        ? true
        : publishParam === 'false'
          ? false
          : existing._status === 'published'
    const shouldPublish = wantsLivePublish && isAlreadyApproved
    const needsAdminApproval = publishParam === 'true' && !isAlreadyApproved

    if (wantsLivePublish) {
      const tickets = await payload.find({
        collection: 'ticket-types',
        overrideAccess: true,
        where: { event: { equals: eventId } },
        limit: 10,
        depth: 0,
      })
      const hasCover = Boolean(existing.heroImage)
      const hasDates =
        Boolean(existing.startsAt) &&
        Boolean(existing.endsAt) &&
        new Date(existing.endsAt) > new Date(existing.startsAt)
      const hasDescription =
        typeof existing.description === 'string' && existing.description.trim().length >= 30
      const hasAddress = typeof existing.address === 'string' && existing.address.trim().length >= 3
      const hasRefundPolicy =
        typeof existing.refundPolicy === 'string' && existing.refundPolicy.trim().length >= 10
      if (
        title.length < 3 ||
        !venue ||
        venue.length < 2 ||
        !Number.isFinite(capacity) ||
        capacity < 1 ||
        !hasCover ||
        !hasDates ||
        !hasDescription ||
        !hasAddress ||
        !hasRefundPolicy ||
        tickets.totalDocs < 1
      ) {
        return Response.json(
          {
            error:
              'Complete all required event details (title, description, dates, venue, address, capacity, cover image, ticket category, and refund policy) in Edit Event before submitting for approval.',
          },
          { status: 400 },
        )
      }
    } else if (form.has('title') && title.length < 3) {
      return Response.json(
        { error: 'Event title must be at least 3 characters.' },
        { status: 400 },
      )
    }

    const data: Record<string, any> = {
      title,
      ...(nextSlug ? { slug: nextSlug } : {}),
      ...(venue ? { venue } : {}),
      ...(Number.isFinite(capacity) && capacity >= 1 ? { capacity } : {}),
      checkInStatus,
      _status: shouldPublish ? 'published' : 'draft',
      reviewStatus: isAlreadyApproved
        ? 'approved'
        : needsAdminApproval
          ? 'pending'
          : existing.reviewStatus || 'draft',
      ...(needsAdminApproval ? { submittedAt: new Date().toISOString() } : {}),
    }

    const updated = await payload.update({
      collection: 'events',
      overrideAccess: false,
      user,
      id: eventId,
      draft: !shouldPublish,
      depth: 0,
      data,
    })

    if (shouldPublish && publishParam === 'true') {
      await logAudit({
        payload,
        action: 'event.published',
        category: 'event',
        actor: user as any,
        targetCollection: 'events',
        targetId: updated.id,
        summary: `Event "${updated.title}" published from dashboard (/events/${updated.slug}).`,
      })
      const origin = resolvePublicOrigin(request)
      await sendTransactionalEmail({
        payload,
        to: user.email,
        subject: `Event Published: ${updated.title} — AZORTIX`,
        title: 'Your event is now live on AZORTIX',
        bodyHtml: `<p><strong>${updated.title}</strong> is published and live.</p><p>Public URL: <a href="${origin}/events/${updated.slug}">${origin}/events/${updated.slug}</a></p>`,
        text: `${updated.title} is live at ${origin}/events/${updated.slug}`,
      })
    } else if (needsAdminApproval) {
      await logAudit({
        payload,
        action: 'event.submitted_for_review',
        category: 'event',
        actor: user as any,
        targetCollection: 'events',
        targetId: updated.id,
        summary: `Event "${updated.title}" submitted for AZORTIX admin approval.`,
      })
    } else if (nextSlug && nextSlug !== existing.slug) {
      await logAudit({
        payload,
        action: 'event.slug_updated',
        category: 'event',
        actor: user as any,
        targetCollection: 'events',
        targetId: updated.id,
        summary: `Event URL changed from /events/${existing.slug} to /events/${updated.slug}.`,
      })
    }

    return Response.json({
      message: needsAdminApproval
        ? 'Event submitted for AZORTIX admin approval! It will appear publicly once approved by an admin.'
        : publishParam === 'true'
          ? 'Event published and live!'
          : publishParam === 'false'
            ? 'Event moved back to draft.'
            : 'Event settings saved.',
      slug: updated.slug,
      status: updated._status,
      reviewStatus: updated.reviewStatus,
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Event settings could not be updated.' },
      { status: 400 },
    )
  }
}

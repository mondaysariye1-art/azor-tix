import { revalidatePath } from 'next/cache'
import { requireActiveDashboardUser } from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { sendTransactionalEmail } from '@/lib/email'
import { getPayloadClient } from '@/lib/payload'
import { resolvePublicOrigin } from '@/lib/paystack'

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser(['admin', 'super-admin'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const user = auth.user

  try {
    const contentType = request.headers.get('content-type') || ''
    let eventId = ''
    let rawDecision = ''
    let reviewNote = ''
    if (contentType.includes('application/json')) {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>
      eventId = String(body.eventId || '').trim()
      rawDecision = String(body.decision || '').trim()
      reviewNote = String(body.reviewNote || '').trim()
    } else {
      const form = await request.formData()
      eventId = String(form.get('eventId') || '').trim()
      rawDecision = String(form.get('decision') || '').trim()
      reviewNote = String(form.get('reviewNote') || '').trim()
    }

    if (rawDecision !== 'approved' && rawDecision !== 'rejected' && rawDecision !== 'cancelled') {
      return Response.json(
        { error: 'Choose a valid review decision (approved, rejected, or cancelled).' },
        { status: 400 },
      )
    }
    const decision: 'approved' | 'rejected' | 'cancelled' = rawDecision

    if (!eventId) {
      return Response.json({ error: 'Missing event ID.' }, { status: 400 })
    }

    if (decision === 'rejected' && reviewNote.length < 3) {
      return Response.json(
        { error: 'Enter a clear rejection reason so the organizer knows what to update.' },
        { status: 400 },
      )
    }

    const payload = await getPayloadClient()
    const existing: any = await payload
      .findByID({
        collection: 'events',
        id: eventId,
        overrideAccess: true,
        draft: true,
        depth: 0,
      })
      .catch(() => null)
    if (!existing) {
      return Response.json({ error: 'Event not found.' }, { status: 404 })
    }

    const reviewedAt = new Date().toISOString()
    const updated: any = await payload.update({
      collection: 'events',
      id: eventId,
      overrideAccess: false,
      user,
      draft: false,
      data: {
        reviewStatus: decision,
        reviewNote,
        reviewedAt,
        reviewedBy: user.id,
        _status: decision === 'approved' ? 'published' : 'draft',
      },
    })

    revalidatePath('/')
    revalidatePath('/discover')
    if (updated.slug) revalidatePath(`/events/${updated.slug}`)
    if (existing.slug && existing.slug !== updated.slug) {
      revalidatePath(`/events/${existing.slug}`)
    }

    const origin = resolvePublicOrigin(request)
    const organizerId =
      typeof existing.organizer === 'object' ? existing.organizer.id : existing.organizer
    const organizer: any = organizerId
      ? await payload
          .findByID({ collection: 'users', id: organizerId, overrideAccess: true, depth: 0 })
          .catch(() => null)
      : null

    let emailStatus: any = undefined
    if (organizer?.email) {
      const liveUrl = `${origin}/events/${updated.slug}`
      const editUrl = `${origin}/dashboard/organizer/events/${updated.id}/edit`
      emailStatus = await sendTransactionalEmail({
        payload,
        to: organizer.email,
        subject: `Event ${
          decision === 'approved'
            ? 'Approved & Published'
            : decision === 'cancelled'
              ? 'Cancelled'
              : 'Rejected — Updates Required'
        }: ${existing.title} — AZORTIX`,
        title:
          decision === 'approved'
            ? 'Your event is approved and live on AZORTIX'
            : decision === 'cancelled'
              ? 'Event cancelled by AZORTIX administration'
              : 'Your event submission was rejected',
        bodyHtml: `<p><strong>${existing.title}</strong> has been reviewed by ${user.name || user.email} (${user.role}).</p><p><strong>Status:</strong> ${decision.toUpperCase()}${
          reviewNote ? `<br/><strong>${decision === 'rejected' ? 'Rejection reason' : 'Review note'}:</strong> ${reviewNote}` : ''
        }</p>${
          decision === 'approved'
            ? `<p>Your event is now live and accepting ticket purchases: <a href="${liveUrl}">${liveUrl}</a></p>`
            : decision === 'rejected'
              ? `<p>Your event remains unpublished. Edit your event and resubmit for approval here: <a href="${editUrl}">${editUrl}</a></p>`
              : '<p>Open your Organizer Dashboard for details.</p>'
        }`,
        text: `Event "${existing.title}" was ${decision} by ${user.name || user.email} (${user.role}). ${reviewNote ? `Reason: ${reviewNote}. ` : ''}${
          decision === 'approved' ? `Live URL: ${liveUrl}` : `Edit & resubmit: ${editUrl}`
        }`,
      })
    }

    await logAudit({
      payload,
      action: `event.review_${decision}`,
      category: 'event',
      actor: user as any,
      targetCollection: 'events',
      targetId: updated.id,
      summary: `${user.role} (${user.email}) ${decision} event "${existing.title}" (${reviewNote || 'no note'}).`,
    })

    return Response.json({
      eventId: updated.id,
      slug: updated.slug,
      reviewStatus: updated.reviewStatus,
      status: updated._status,
      reviewNote,
      reviewedAt,
      reviewedBy: {
        id: user.id,
        name: user.name || user.email,
        email: user.email,
        role: user.role,
      },
      emailStatus,
      message:
        decision === 'approved'
          ? 'Event approved and published live on AZORTIX.'
          : decision === 'cancelled'
            ? 'Event cancelled and removed from public listings.'
            : 'Event rejected and returned to organizer with reason.',
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to review event.' },
      { status: 400 },
    )
  }
}

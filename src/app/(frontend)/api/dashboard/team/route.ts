import { requireActiveDashboardUser } from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser(['organizer', 'admin', 'super-admin'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const user = auth.user

  const contentType = request.headers.get('content-type') || ''
  let action = 'create'
  let memberId = ''
  let name = ''
  let email = ''
  let role = ''
  let assignedEvents: string[] = []

  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>
    action = String(body.action || 'create').trim()
    memberId = String(body.memberId || '').trim()
    name = String(body.name || '').trim()
    email = String(body.email || '').trim().toLowerCase()
    role = String(body.role || '').trim()
    assignedEvents = Array.isArray(body.assignedEvents)
      ? body.assignedEvents.map(String).filter(Boolean)
      : []
  } else {
    const form = await request.formData()
    action = String(form.get('action') || 'create').trim()
    memberId = String(form.get('memberId') || '').trim()
    name = String(form.get('name') || '').trim()
    email = String(form.get('email') || '')
      .trim()
      .toLowerCase()
    role = String(form.get('role') || '').trim()
    assignedEvents = form
      .getAll('assignedEvents')
      .map(String)
      .flatMap((v) => v.split(','))
      .map((v) => v.trim())
      .filter(Boolean)
  }

  const payload = await getPayloadClient()

  if (action === 'revoke') {
    if (!memberId) return Response.json({ error: 'Missing team member ID.' }, { status: 400 })
    const existing: any = await payload
      .findByID({
        collection: 'team-memberships',
        id: memberId,
        overrideAccess: false,
        user,
        depth: 0,
      })
      .catch(() => null)
    if (!existing) return Response.json({ error: 'Team member not found.' }, { status: 404 })
    await payload.update({
      collection: 'team-memberships',
      id: memberId,
      overrideAccess: false,
      user,
      data: { active: false, invitationStatus: 'revoked' },
    })
    await logAudit({
      payload,
      action: 'team.member_revoked',
      category: 'user',
      actor: user as any,
      targetCollection: 'team-memberships',
      targetId: memberId,
      summary: `Revoked team access for ${existing.email} (${existing.role}).`,
    })
    return Response.json({ message: `Access revoked for ${existing.name}.` })
  }

  if (action === 'update-events') {
    if (!memberId) return Response.json({ error: 'Missing team member ID.' }, { status: 400 })
    const existing: any = await payload
      .findByID({
        collection: 'team-memberships',
        id: memberId,
        overrideAccess: false,
        user,
        depth: 0,
      })
      .catch(() => null)
    if (!existing) return Response.json({ error: 'Team member not found.' }, { status: 404 })

    const validatedEventIds: string[] = []
    for (const eid of assignedEvents) {
      const ev = await payload
        .findByID({
          collection: 'events',
          id: eid,
          overrideAccess: false,
          user,
          draft: true,
          depth: 0,
        })
        .catch(() => null)
      if (ev) validatedEventIds.push(String(ev.id))
    }

    if (existing.role === 'check-in' && validatedEventIds.length === 0) {
      return Response.json(
        { error: 'Check-in staff must be assigned to at least one specific event.' },
        { status: 400 },
      )
    }

    await payload.update({
      collection: 'team-memberships',
      id: memberId,
      overrideAccess: false,
      user,
      data: { assignedEvents: validatedEventIds, active: true } as any,
    })
    await logAudit({
      payload,
      action: 'team.events_updated',
      category: 'user',
      actor: user as any,
      targetCollection: 'team-memberships',
      targetId: memberId,
      summary: `Updated assigned events (${validatedEventIds.length}) for ${existing.email}.`,
    })
    return Response.json({ message: `Updated event assignments for ${existing.name}.` })
  }

  if (
    name.length < 2 ||
    !email.includes('@') ||
    !['manager', 'check-in', 'analyst', 'finance'].includes(role)
  ) {
    return Response.json({ error: 'Enter valid teammate details.' }, { status: 400 })
  }

  const validatedEventIds: string[] = []
  for (const eid of assignedEvents) {
    const ev = await payload
      .findByID({
        collection: 'events',
        id: eid,
        overrideAccess: false,
        user,
        draft: true,
        depth: 0,
      })
      .catch(() => null)
    if (ev) validatedEventIds.push(String(ev.id))
  }

  if (role === 'check-in' && validatedEventIds.length === 0) {
    return Response.json(
      { error: 'Select at least one specific event to assign this check-in staff member to.' },
      { status: 400 },
    )
  }

  const permissions: Array<'events' | 'attendees' | 'check-in' | 'reports' | 'finance'> =
    role === 'manager'
      ? ['events', 'attendees', 'check-in', 'reports']
      : role === 'check-in'
        ? ['attendees', 'check-in']
        : role === 'analyst'
          ? ['reports']
          : ['finance', 'reports']

  const created = await payload.create({
    collection: 'team-memberships',
    overrideAccess: false,
    user,
    data: {
      organizer: user.id,
      name,
      email,
      role: role as 'manager' | 'check-in' | 'analyst' | 'finance',
      permissions,
      assignedEvents: validatedEventIds,
      invitationStatus: 'accepted',
      active: true,
    } as any,
  })

  await logAudit({
    payload,
    action: 'team.member_added',
    category: 'user',
    actor: user as any,
    targetCollection: 'team-memberships',
    targetId: created.id,
    summary: `Assigned ${name} (${email}) as ${role} with ${validatedEventIds.length} assigned event(s).`,
  })

  return Response.json({
    member: created,
    message:
      role === 'check-in'
        ? `Check-in staff ${name} assigned to ${validatedEventIds.length} event${validatedEventIds.length === 1 ? '' : 's'}.`
        : `Teammate ${name} added.`,
  })
}

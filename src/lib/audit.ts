import 'server-only'
import type { Payload } from 'payload'

export type AuditCategory =
  | 'auth'
  | 'event'
  | 'ticket'
  | 'bank'
  | 'appeal'
  | 'user'
  | 'payout'
  | 'refund'
  | 'admin'
  | 'settings'

export async function logAudit(params: {
  payload: Payload
  action: string
  category: AuditCategory
  actor?: { id?: string | number; email?: string; role?: string } | null
  targetCollection?: string
  targetId?: string | number
  summary: string
  metadata?: Record<string, unknown>
}) {
  try {
    await params.payload.create({
      collection: 'audit-logs' as any,
      overrideAccess: true,
      data: {
        action: params.action,
        category: params.category,
        actor: params.actor?.id || undefined,
        actorEmail: params.actor?.email || 'system',
        actorRole: params.actor?.role || 'system',
        targetCollection: params.targetCollection || undefined,
        targetId: params.targetId !== undefined ? String(params.targetId) : undefined,
        summary: params.summary,
        metadata: params.metadata || undefined,
      } as any,
    })
  } catch (error) {
    console.error('Audit log write skipped:', error)
  }
}

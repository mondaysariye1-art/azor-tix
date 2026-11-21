import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const password = typeof body.password === 'string' ? body.password : ''
    const token = typeof body.token === 'string' ? body.token : ''
    if (!token || password.length < 12) {
      return Response.json(
        { error: 'Use a valid reset link and a password of at least 12 characters.' },
        { status: 400 },
      )
    }
    const payload = await getPayloadClient()
    const resetResult = await payload.resetPassword({
      collection: 'users',
      data: { password, token },
      overrideAccess: true,
    })
    if (resetResult?.user?.id) {
      const currentVersion = Number((resetResult.user as any).tokenVersion ?? 0)
      await payload.update({
        collection: 'users',
        id: String(resetResult.user.id),
        overrideAccess: true,
        data: { tokenVersion: currentVersion + 1 } as any,
      })
    }
    return Response.json({ message: 'Password updated. You can now log in.' })
  } catch {
    return Response.json({ error: 'This reset link is invalid or expired.' }, { status: 400 })
  }
}

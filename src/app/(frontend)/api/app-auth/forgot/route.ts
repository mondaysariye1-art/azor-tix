export async function POST(request: Request) {
  const body = await request.json()
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email) return Response.json({ error: 'Enter your email address.' }, { status: 400 })
  return Response.json({
    message:
      'Password reset delivery is temporarily disabled. Contact AZOR TIX support if you need account recovery.',
  })
}

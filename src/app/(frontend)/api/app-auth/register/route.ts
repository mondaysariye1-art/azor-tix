import { cookies } from 'next/headers'
import { APP_SESSION_COOKIE, sessionCookieOptions } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const accountType = body.accountType === 'individual' ? 'individual' : 'organization'
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const businessName =
      accountType === 'individual'
        ? name
        : typeof body.businessName === 'string'
          ? body.businessName.trim()
          : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const country = typeof body.country === 'string' ? body.country.trim() : ''
    const state = typeof body.state === 'string' ? body.state.trim() : ''
    const city = typeof body.city === 'string' ? body.city.trim() : ''
    const businessAddress =
      typeof body.businessAddress === 'string' ? body.businessAddress.trim() : ''
    const cacNumber = typeof body.cacNumber === 'string' ? body.cacNumber.trim() : ''
    const website = typeof body.website === 'string' ? body.website.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''
    if (
      name.length < 2 ||
      businessName.length < 2 ||
      phone.length < 10 ||
      !country ||
      !state ||
      !city ||
      (accountType === 'organization' && businessAddress.length < 5) ||
      !emailPattern.test(email) ||
      password.length < 12 ||
      password !== confirmPassword ||
      body.terms !== 'on'
    ) {
      return Response.json(
        {
          error:
            'Complete every required field, use matching 12-character passwords, and accept the terms.',
        },
        { status: 400 },
      )
    }
    const payload = await getPayloadClient()
    const existing = await payload.find({
      collection: 'users',
      overrideAccess: true,
      showHiddenFields: true,
      limit: 1,
      where: { email: { equals: email } },
    })
    const existingUser = existing.docs[0]

    if (existingUser) {
      if (!existingUser._verified) {
        await payload.update({
          collection: 'users',
          id: existingUser.id,
          overrideAccess: true,
          data: { _verified: true },
        })
        return Response.json({
          message: 'Your existing account is ready. You can log in with your original password.',
        })
      }

      return Response.json(
        { error: 'An account with that email already exists. Log in or reset your password.' },
        { status: 409 },
      )
    }

    const user = await payload.create({
      collection: 'users',
      overrideAccess: true,
      disableVerificationEmail: true,
      showHiddenFields: true,
      data: {
        name,
        businessName,
        accountType,
        phone,
        country,
        state,
        city,
        businessAddress: accountType === 'organization' ? businessAddress : undefined,
        cacNumber: accountType === 'organization' ? cacNumber : undefined,
        website,
        email,
        password,
        role: 'organizer',
        accountStatus: 'active',
        _verified: true,
      },
    })
    await payload.create({
      collection: 'organizer-profiles',
      overrideAccess: true,
      data: {
        owner: user.id,
        displayName: businessName,
        slug: `${slugify(businessName)}-${String(user.id).slice(0, 8)}`,
        contact: { email, phone },
        social: { website },
      },
    })
    const login = await payload.login({
      collection: 'users',
      overrideAccess: false,
      data: { email, password },
      depth: 0,
    })
    if (login.token) {
      ;(await cookies()).set(APP_SESSION_COOKIE, login.token, sessionCookieOptions())
    }

    return Response.json({
      message: 'Account created. Opening your organizer dashboard…',
      role: 'organizer',
    })
  } catch {
    return Response.json(
      { error: 'The account could not be created. Check your details and try again.' },
      { status: 500 },
    )
  }
}

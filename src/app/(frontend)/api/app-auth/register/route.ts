import { cookies } from 'next/headers'
import { APP_SESSION_COOKIE, isHttpsRequest, sessionCookieOptions } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-') || 'organizer'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (body.accountType !== 'individual' && body.accountType !== 'organization') {
      return Response.json(
        { error: 'Choose either an Individual or Organization account type.' },
        { status: 400 },
      )
    }

    const accountType = body.accountType as 'individual' | 'organization'
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
    const rawName = typeof body.name === 'string' ? body.name.trim() : ''
    const name =
      accountType === 'individual' ? `${firstName} ${lastName}`.trim() || rawName : rawName
    const businessName =
      accountType === 'organization'
        ? typeof body.businessName === 'string'
          ? body.businessName.trim()
          : ''
        : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const country = typeof body.country === 'string' && body.country.trim() ? body.country.trim() : 'Nigeria'
    const state = typeof body.state === 'string' && body.state.trim() ? body.state.trim() : 'FCT'
    const city = typeof body.city === 'string' && body.city.trim() ? body.city.trim() : 'Abuja'
    const businessAddress =
      accountType === 'organization' && typeof body.businessAddress === 'string'
        ? body.businessAddress.trim()
        : ''
    const cacNumber =
      accountType === 'organization' && typeof body.cacNumber === 'string'
        ? body.cacNumber.trim()
        : ''
    const website =
      accountType === 'organization' && typeof body.website === 'string' ? body.website.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''
    const termsAccepted = body.terms === 'on' || body.terms === true

    if (accountType === 'individual') {
      if (firstName.length < 2 || lastName.length < 2) {
        return Response.json(
          { error: 'Enter your first name and last name (at least 2 characters each).' },
          { status: 400 },
        )
      }
    } else {
      if (businessName.length < 2 || name.length < 2) {
        return Response.json(
          {
            error:
              'Enter your organization name and the contact person’s full name.',
          },
          { status: 400 },
        )
      }
    }

    if (!emailPattern.test(email)) {
      return Response.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }
    if (phone.replace(/\s+/g, '').length < 10) {
      return Response.json({ error: 'Enter a valid phone number.' }, { status: 400 })
    }
    if (password.length < 12) {
      return Response.json(
        { error: 'Password must be at least 12 characters long.' },
        { status: 400 },
      )
    }
    if (password !== confirmPassword) {
      return Response.json({ error: 'Passwords do not match.' }, { status: 400 })
    }
    if (!termsAccepted) {
      return Response.json({ error: 'Accept the organizer terms to continue.' }, { status: 400 })
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
        firstName: accountType === 'individual' ? firstName : undefined,
        lastName: accountType === 'individual' ? lastName : undefined,
        businessName: accountType === 'organization' ? businessName : undefined,
        accountType,
        phone,
        country,
        state,
        city,
        businessAddress: accountType === 'organization' && businessAddress ? businessAddress : undefined,
        cacNumber: accountType === 'organization' && cacNumber ? cacNumber : undefined,
        website: accountType === 'organization' && website ? website : undefined,
        email,
        password,
        role: 'organizer',
        accountStatus: 'active',
        _verified: true,
      },
    })

    const displayName = accountType === 'organization' ? businessName : name
    await payload.create({
      collection: 'organizer-profiles',
      overrideAccess: true,
      data: {
        owner: user.id,
        displayName,
        slug: `${slugify(displayName)}-${String(user.id).slice(0, 8)}`,
        contact: { email, phone },
        social: { website: website || undefined },
      },
    })

    const login = await payload.login({
      collection: 'users',
      overrideAccess: false,
      data: { email, password },
      depth: 0,
    })
    if (login.token) {
      ;(await cookies()).set(
        APP_SESSION_COOKIE,
        login.token,
        sessionCookieOptions(undefined, isHttpsRequest(request)),
      )
    }

    return Response.json({
      message: `${accountType === 'organization' ? 'Organization' : 'Individual'} account created. Opening your organizer dashboard…`,
      role: 'organizer',
      accountType,
      user: {
        id: user.id,
        name,
        firstName: accountType === 'individual' ? firstName : undefined,
        lastName: accountType === 'individual' ? lastName : undefined,
        businessName: accountType === 'organization' ? businessName : undefined,
        email,
        accountType,
      },
    })
  } catch {
    return Response.json(
      { error: 'The account could not be created. Check your details and try again.' },
      { status: 500 },
    )
  }
}

import { getCurrentAppUser } from '@/lib/app-auth'
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
  const user = await getCurrentAppUser()
  if (!user || user.role !== 'organizer') {
    return Response.json({ error: 'Organizer access required.' }, { status: 403 })
  }

  try {
    const form = await request.formData()
    const text = (name: string) => String(form.get(name) || '').trim()
    const displayName = text('displayName')
    const email = text('email').toLowerCase()
    const phone = text('phone')
    if (displayName.length < 2 || !emailPattern.test(email) || phone.length < 10) {
      return Response.json(
        { error: 'Enter a valid organizer name, email, and phone.' },
        { status: 400 },
      )
    }

    const payload = await getPayloadClient()
    const existing = await payload.find({
      collection: 'organizer-profiles',
      overrideAccess: false,
      user,
      where: { owner: { equals: user.id } },
      limit: 1,
      depth: 0,
    })

    let logo: string | undefined
    const upload = form.get('logo')
    if (upload instanceof File && upload.size > 0) {
      if (
        upload.size > 5_000_000 ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(upload.type)
      ) {
        return Response.json(
          { error: 'Logo must be a JPG, PNG, or WebP under 5 MB.' },
          { status: 400 },
        )
      }
      const media = await payload.create({
        collection: 'media',
        overrideAccess: true,
        data: { alt: `${displayName} organizer logo` },
        file: {
          data: Buffer.from(await upload.arrayBuffer()),
          mimetype: upload.type,
          name: upload.name,
          size: upload.size,
        },
      })
      logo = String(media.id)
    }

    const data: any = {
      displayName,
      about: text('about'),
      contact: { email, phone },
      social: {
        instagram: text('instagram'),
        facebook: text('facebook'),
        tiktok: text('tiktok'),
        website: text('website'),
      },
      ...(logo ? { logo } : {}),
    }

    const profile: any = existing.docs[0]
      ? await payload.update({
          collection: 'organizer-profiles',
          overrideAccess: false,
          user,
          id: existing.docs[0].id,
          data,
        })
      : await payload.create({
          collection: 'organizer-profiles',
          overrideAccess: false,
          user,
          data: {
            ...data,
            owner: user.id,
            slug: `${slugify(displayName)}-${String(user.id).slice(0, 8)}`,
          },
        })

    await payload.update({
      collection: 'users',
      overrideAccess: false,
      user,
      id: user.id,
      data: {
        name: text('contactName') || user.name,
        businessName: displayName,
        phone,
        onboardingComplete: true,
      },
    })

    return Response.json({ message: 'Organizer profile saved.', slug: profile.slug })
  } catch {
    return Response.json({ error: 'The organizer profile could not be saved.' }, { status: 400 })
  }
}

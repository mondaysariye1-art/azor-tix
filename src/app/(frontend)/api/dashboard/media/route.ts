import path from 'node:path'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireActiveDashboardUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB

function detectImageMimeType(buffer: Buffer, declaredType: string, filename: string): string | null {
  // Inspect magic bytes first so valid images work even when browser omits or mislabels MIME type
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }

  // Fallback check only if magic bytes didn't match — reject anything that isn't a real PNG/JPEG/WebP
  const normalizedDeclared = declaredType.toLowerCase().trim()
  const ext = path.extname(filename).toLowerCase()
  if (normalizedDeclared === 'image/jpg' || ext === '.jpg' || ext === '.jpeg') {
    return null
  }
  return null
}

function sanitizeFilename(originalName: string, mimeType: string): string {
  const extByMime: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  }
  const base = path.basename(originalName || 'event-image')
  const stem = base
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  const ext = extByMime[mimeType] || '.jpg'
  return `${stem || 'event-photo'}${ext}`
}

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser(['organizer', 'admin', 'super-admin'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const user = auth.user

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json(
      { error: 'Invalid upload request. Please select an image file and try again.' },
      { status: 400 },
    )
  }

  const file = form.get('file')
  if (!(file instanceof File) || file.size <= 0) {
    return Response.json({ error: 'Select a valid image file to upload.' }, { status: 400 })
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return Response.json(
      { error: `Image is too large (${sizeMb} MB). Maximum supported size is 10 MB.` },
      { status: 400 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const detectedMime = detectImageMimeType(buffer, file.type || '', file.name || '')
  if (!detectedMime) {
    return Response.json(
      { error: 'Unsupported or corrupted image file. Please upload a valid JPG, PNG, or WebP photo.' },
      { status: 400 },
    )
  }

  const safeName = sanitizeFilename(file.name, detectedMime)
  const alt = String(form.get('alt') || 'AZORTIX event image').trim().slice(0, 180) || 'AZORTIX event image'
  const eventId = String(form.get('eventId') || '').trim()
  const kind = String(form.get('kind') || 'cover').trim()

  try {
    const payload = await getPayloadClient()
    const created: any = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt },
      file: {
        data: buffer,
        mimetype: detectedMime,
        name: safeName,
        size: buffer.length,
      },
    })

    const mediaUrl =
      typeof created.url === 'string' && created.url
        ? created.url
        : created.filename
          ? `/api/media/file/${encodeURIComponent(String(created.filename))}`
          : ''

    let linkedToEvent = false
    if (eventId && (kind === 'cover' || kind === 'gallery')) {
      const existing: any = await payload
        .findByID({
          collection: 'events',
          id: eventId,
          overrideAccess: false,
          user,
          depth: 0,
          draft: true,
        })
        .catch(() => null)

      if (existing) {
        const isLiveApproved =
          existing._status === 'published' && existing.reviewStatus === 'approved'
        if (kind === 'cover') {
          await payload.update({
            collection: 'events',
            id: existing.id,
            overrideAccess: false,
            user,
            draft: !isLiveApproved,
            depth: 0,
            data: {
              heroImage: created.id,
              ...(isLiveApproved ? { _status: 'published' } : {}),
            } as any,
          })
          linkedToEvent = true
        } else if (kind === 'gallery') {
          const prevGallery = Array.isArray(existing.gallery)
            ? existing.gallery.map((g: any) => (typeof g === 'object' ? g.id : g)).filter(Boolean)
            : []
          await payload.update({
            collection: 'events',
            id: existing.id,
            overrideAccess: false,
            user,
            draft: !isLiveApproved,
            depth: 0,
            data: {
              gallery: [...prevGallery, created.id],
              ...(isLiveApproved ? { _status: 'published' } : {}),
            } as any,
          })
          linkedToEvent = true
        }

        if (linkedToEvent) {
          revalidateTag('public-events', { expire: 0 })
          revalidatePath('/')
          revalidatePath('/discover')
          if (existing.slug) {
            revalidateTag(`event:${existing.slug}`, { expire: 0 })
            revalidatePath(`/events/${existing.slug}`)
          }
        }
      }
    }

    return Response.json({
      id: String(created.id),
      url: mediaUrl,
      filename: String(created.filename || safeName),
      alt: String(created.alt || alt),
      mimeType: String(created.mimeType || detectedMime),
      filesize: Number(created.filesize || buffer.length),
      linkedToEvent,
    })
  } catch (error) {
    console.error('[media-upload] failed:', error)
    return Response.json(
      {
        error:
          error instanceof Error
            ? `Image upload failed: ${error.message}`
            : 'Unable to save the uploaded image. Please try again.',
      },
      { status: 500 },
    )
  }
}

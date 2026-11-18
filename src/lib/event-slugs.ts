import type { Payload } from 'payload'

export function slugifyEventTitle(value: string): string {
  const normalized = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'event'
}

export async function generateUniqueEventSlug(
  payload: Payload,
  titleOrSlug: string,
  excludeEventId?: string | number,
): Promise<string> {
  const base = slugifyEventTitle(titleOrSlug)
  const [published, drafts] = await Promise.all([
    payload.find({
      collection: 'events',
      overrideAccess: true,
      draft: false,
      limit: 500,
      depth: 0,
      where: {
        or: [{ slug: { equals: base } }, { slug: { like: `${base}-` } }],
      },
    }),
    payload.find({
      collection: 'events',
      overrideAccess: true,
      draft: true,
      limit: 500,
      depth: 0,
      where: {
        or: [{ slug: { equals: base } }, { slug: { like: `${base}-` } }],
      },
    }),
  ])

  const taken = new Set<string>()
  for (const doc of [...published.docs, ...drafts.docs]) {
    if (excludeEventId !== undefined && String(doc.id) === String(excludeEventId)) continue
    if (typeof doc.slug === 'string' && doc.slug) {
      taken.add(doc.slug)
    }
  }

  if (!taken.has(base)) return base

  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1
  }
  return `${base}-${suffix}`
}

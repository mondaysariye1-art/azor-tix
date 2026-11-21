import 'server-only'
import { unstable_cache } from 'next/cache'
import { findBySlug, getPayloadClient } from '@/lib/payload'

export const getOrganizerProfiles = unstable_cache(
  async () => {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'organizer-profiles',
      overrideAccess: false,
      limit: 100,
      depth: 1,
      sort: 'displayName',
    })
    return result.docs
  },
  ['organizer-profiles'],
  { revalidate: 3600, tags: ['organizer-profiles'] },
)

export async function getOrganizerProfile(slug: string) {
  return unstable_cache(
    () => findBySlug('organizer-profiles', slug, { depth: 2 }),
    ['organizer-profile', slug],
    { revalidate: 3600, tags: ['organizer-profiles', `organizer:${slug}`] },
  )()
}

export async function getOrganizerPublishedEvents(owner: string) {
  return unstable_cache(
    async () => {
      const payload = await getPayloadClient()
      const result = await payload.find({
        collection: 'events',
        overrideAccess: false,
        where: {
          and: [
            { organizer: { equals: owner } },
            { _status: { equals: 'published' } },
            { reviewStatus: { equals: 'approved' } },
          ],
        },
        limit: 50,
        depth: 1,
        sort: 'startsAt',
      })
      return result.docs
    },
    ['organizer-events', owner],
    { revalidate: 3600, tags: ['public-events', `organizer-events:${owner}`] },
  )()
}

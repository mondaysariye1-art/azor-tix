import type { Access, FieldAccess, PayloadRequest } from 'payload'

type AppUser = {
  collection?: string
  id: number | string
  role?: 'admin' | 'organizer' | 'super-admin'
}

const EMPTY_UUID_SENTINEL = '00000000-0000-0000-0000-000000000000'
const OWNED_EVENT_IDS_CACHE_KEY = '__azorOwnedEventIdsByUser'

export const getAppUser = (user: unknown): AppUser | null => {
  const candidate = user as AppUser | null
  return candidate?.collection === 'users' ? candidate : null
}

export const isStaff = (user: unknown) => {
  const appUser = getAppUser(user)
  return appUser?.role === 'admin' || appUser?.role === 'super-admin'
}

export const isSuperAdmin = (user: unknown) => getAppUser(user)?.role === 'super-admin'

export const staffOnly: Access = ({ req }) => isStaff(req.user)
export const superAdminOnly: Access = ({ req }) => isSuperAdmin(req.user)

export const staffFieldOnly: FieldAccess = ({ req }) => isStaff(req.user)
export const superAdminFieldOnly: FieldAccess = ({ req }) => isSuperAdmin(req.user)

export async function getOwnedEventIdsForUser(
  req: PayloadRequest,
  userId: number | string,
): Promise<Array<number | string>> {
  const cacheMap =
    (req.context?.[OWNED_EVENT_IDS_CACHE_KEY] as
      | Map<string, Array<number | string>>
      | undefined) ?? new Map<string, Array<number | string>>()
  const cacheKey = String(userId)
  if (cacheMap.has(cacheKey)) {
    return cacheMap.get(cacheKey)!
  }

  const owned = await req.payload.find({
    collection: 'events',
    overrideAccess: true,
    where: { organizer: { equals: userId } },
    limit: 1000,
    depth: 0,
    draft: true,
    pagination: false,
    select: {},
  })
  const ids = owned.docs.map((doc) => doc.id).filter(Boolean)
  cacheMap.set(cacheKey, ids)
  if (req.context && typeof req.context === 'object') {
    req.context[OWNED_EVENT_IDS_CACHE_KEY] = cacheMap
  }
  return ids
}

export const ownProfileOrStaff: Access = ({ req }) => {
  const user = getAppUser(req.user)
  if (!user) return false
  if (isStaff(user)) return true
  return { id: { equals: user.id } }
}

export const organizerOwned: Access = ({ req }) => {
  const user = getAppUser(req.user)
  if (!user) return false
  if (isStaff(user)) return true
  return { organizer: { equals: user.id } }
}

export const eventOwned: Access = async ({ req }) => {
  const user = getAppUser(req.user)
  if (!user) return false
  if (isStaff(user)) return true
  const ids = await getOwnedEventIdsForUser(req, user.id)
  return {
    event: {
      in: ids.length > 0 ? ids : [EMPTY_UUID_SENTINEL],
    },
  }
}

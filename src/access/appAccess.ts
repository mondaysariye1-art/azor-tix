import type { Access, FieldAccess } from 'payload'

type AppUser = {
  collection?: string
  id: number | string
  role?: 'admin' | 'organizer' | 'super-admin'
}

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

export const eventOwned: Access = ({ req }) => {
  const user = getAppUser(req.user)
  if (!user) return false
  if (isStaff(user)) return true
  return { 'event.organizer': { equals: user.id } }
}

import 'server-only'
import type { Payload } from 'payload'

const INITIAL_STAFF_PASSWORD = process.env.ADMIN_SEED_PASSWORD || 'AZORMAKEIT'

const SEEDED_STAFF = [
  {
    email: 'admin@azortix.com',
    name: 'AZORTIX Admin',
    role: 'admin' as const,
  },
  {
    email: 'superadmin@azortix.com',
    name: 'AZORTIX Super Admin',
    role: 'super-admin' as const,
  },
]

const globalForSeed = globalThis as unknown as {
  __azorAdminSeedPromise?: Promise<void>
}

async function runAdminSeed(payload: Payload) {
  for (const account of SEEDED_STAFF) {
    const existing = await payload.find({
      collection: 'users',
      overrideAccess: true,
      showHiddenFields: true,
      limit: 1,
      depth: 0,
      where: { email: { equals: account.email } },
    })

    if (existing.docs.length === 0) {
      await payload.create({
        collection: 'users',
        overrideAccess: true,
        disableVerificationEmail: true,
        showHiddenFields: true,
        data: {
          email: account.email,
          password: INITIAL_STAFF_PASSWORD,
          name: account.name,
          role: account.role,
          accountType: 'individual',
          accountStatus: 'active',
          mustChangePassword: true,
          _verified: true,
        } as any,
      })
    }
  }
}

export async function ensureSeededStaffAccounts(payload: Payload) {
  if (!globalForSeed.__azorAdminSeedPromise) {
    globalForSeed.__azorAdminSeedPromise = runAdminSeed(payload).catch((error) => {
      globalForSeed.__azorAdminSeedPromise = undefined
      console.error('Failed to seed staff accounts:', error)
    })
  }
  await globalForSeed.__azorAdminSeedPromise
}

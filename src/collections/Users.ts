import type { CollectionConfig } from 'payload'
import {
  isStaff,
  ownProfileOrStaff,
  staffFieldOnly,
  staffOnly,
  superAdminFieldOnly,
} from '@/access/appAccess'

const PROTECTED_SYSTEM_EMAILS = new Set(['admin@azortix.com', 'superadmin@azortix.com'])

export function isProtectedAdminAccount(user: { role?: unknown; email?: unknown } | null | undefined) {
  if (!user) return false
  const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : ''
  return user.role === 'admin' || user.role === 'super-admin' || PROTECTED_SYSTEM_EMAILS.has(email)
}

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    verify: {
      generateEmailSubject: () => 'Verify your AZORTIX organizer account',
      generateEmailHTML: ({ token, user }) =>
        `<p>Hello ${user.name || 'there'},</p><p>Verify your AZORTIX organizer account:</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/verify-email?token=${encodeURIComponent(token)}">Verify email</a></p>`,
    },
    forgotPassword: {
      generateEmailSubject: () => 'Reset your AZORTIX password',
      generateEmailHTML: (args) =>
        `<p>Hello ${args?.user?.name || 'there'},</p><p>Reset your AZORTIX password:</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/reset-password?token=${encodeURIComponent(args?.token || '')}">Reset password</a></p>`,
    },
    tokenExpiration: 60 * 60 * 24 * 7,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
  },
  access: {
    create: () => false,
    read: ownProfileOrStaff,
    update: ownProfileOrStaff,
    delete: ({ req }) => isStaff(req.user),
    admin: () => false,
  },
  admin: {
    hidden: true,
    useAsTitle: 'email',
  },
  hooks: {
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        if (operation === 'update' && originalDoc && isProtectedAdminAccount(originalDoc)) {
          if (data.role && data.role !== originalDoc.role) {
            throw new Error(
              'Permanent administrator roles (Admin and Super Admin) cannot be changed or demoted.',
            )
          }
          if (data.accountStatus && data.accountStatus !== 'active') {
            throw new Error(
              'Permanent administrator accounts (Admin and Super Admin) cannot be deactivated, suspended, or disabled.',
            )
          }
          const origEmail =
            typeof originalDoc.email === 'string' ? originalDoc.email.trim().toLowerCase() : ''
          if (
            PROTECTED_SYSTEM_EMAILS.has(origEmail) &&
            typeof data.email === 'string' &&
            data.email.trim().toLowerCase() !== origEmail
          ) {
            throw new Error('System administrator email cannot be reassigned.')
          }
        }
        return data
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const target = await req.payload
          .findByID({
            collection: 'users',
            id,
            overrideAccess: true,
            depth: 0,
            req,
          })
          .catch(() => null)
        if (target && isProtectedAdminAccount(target)) {
          throw new Error(
            'Permanent administrator accounts (Admin and Super Admin) cannot be deleted or removed.',
          )
        }
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'firstName',
      type: 'text',
    },
    {
      name: 'lastName',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'organizer',
      saveToJWT: true,
      options: [
        { label: 'Organizer', value: 'organizer' },
        { label: 'Admin', value: 'admin' },
        { label: 'Super Admin', value: 'super-admin' },
      ],
      access: {
        create: staffFieldOnly,
        update: superAdminFieldOnly,
      },
    },
    {
      name: 'accountStatus',
      type: 'select',
      required: true,
      defaultValue: 'active',
      saveToJWT: true,
      options: ['active', 'suspended'],
      access: {
        create: staffFieldOnly,
        update: staffFieldOnly,
      },
    },
    {
      name: 'mustChangePassword',
      type: 'checkbox',
      defaultValue: false,
      saveToJWT: true,
      access: {
        create: superAdminFieldOnly,
        update: superAdminFieldOnly,
      },
    },
    {
      name: 'tokenVersion',
      type: 'number',
      defaultValue: 0,
      saveToJWT: true,
      admin: { hidden: true },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'businessName',
      type: 'text',
    },
    {
      name: 'accountType',
      type: 'select',
      defaultValue: 'individual',
      saveToJWT: true,
      options: [
        { label: 'Individual', value: 'individual' },
        { label: 'Organization', value: 'organization' },
      ],
    },
    { name: 'country', type: 'text' },
    { name: 'state', type: 'text' },
    { name: 'city', type: 'text' },
    { name: 'businessAddress', type: 'textarea' },
    { name: 'cacNumber', type: 'text' },
    { name: 'website', type: 'text' },
    { name: 'onboardingComplete', type: 'checkbox', defaultValue: false },
    {
      name: 'bio',
      type: 'textarea',
    },
    {
      name: 'bank',
      type: 'group',
      access: {
        read: ({ req, id }) =>
          Boolean(
            req.user?.collection === 'users' &&
            (req.user.id === id || req.user.role === 'admin' || req.user.role === 'super-admin'),
          ),
        update: ({ req, id }) =>
          Boolean(
            req.user?.collection === 'users' &&
            (req.user.id === id || req.user.role === 'super-admin'),
          ),
      },
      fields: [
        { name: 'bankCode', type: 'text' },
        { name: 'accountNumber', type: 'text' },
        { name: 'accountName', type: 'text' },
      ],
    },
  ],
}

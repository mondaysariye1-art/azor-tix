import type { CollectionConfig } from 'payload'
import {
  ownProfileOrStaff,
  staffFieldOnly,
  staffOnly,
  superAdminFieldOnly,
} from '@/access/appAccess'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    verify: {
      generateEmailSubject: () => 'Verify your AZOR TIX organizer account',
      generateEmailHTML: ({ token, user }) =>
        `<p>Hello ${user.name || 'there'},</p><p>Verify your AZOR TIX organizer account:</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/verify-email?token=${encodeURIComponent(token)}">Verify email</a></p>`,
    },
    forgotPassword: {
      generateEmailSubject: () => 'Reset your AZOR TIX password',
      generateEmailHTML: (args) =>
        `<p>Hello ${args?.user?.name || 'there'},</p><p>Reset your AZOR TIX password:</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/reset-password?token=${encodeURIComponent(args?.token || '')}">Reset password</a></p>`,
    },
    tokenExpiration: 60 * 60 * 24 * 7,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
  },
  access: {
    create: () => false,
    read: ownProfileOrStaff,
    update: ownProfileOrStaff,
    delete: staffOnly,
    admin: () => false,
  },
  admin: {
    hidden: true,
    useAsTitle: 'email',
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
            (req.user.id === id || req.user.role === 'super-admin'),
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

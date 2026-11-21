import type { CollectionConfig } from 'payload'
import {
  eventOwned,
  getAppUser,
  isStaff,
  organizerOwned,
  staffOnly,
  superAdminOnly,
} from '@/access/appAccess'

const noPublicCreate = () => false

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: { group: 'Commerce', useAsTitle: 'reference' },
  access: {
    create: noPublicCreate,
    read: eventOwned,
    update: staffOnly,
    delete: superAdminOnly,
  },
  fields: [
    { name: 'reference', type: 'text', required: true, unique: true, index: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true, index: true },
    {
      name: 'customer',
      type: 'group',
      fields: [
        { name: 'firstName', type: 'text', required: true },
        { name: 'lastName', type: 'text', required: true },
        { name: 'email', type: 'email', required: true, index: true },
        { name: 'phone', type: 'text', required: true },
      ],
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'ticketType', type: 'relationship', relationTo: 'ticket-types', required: false },
        { name: 'name', type: 'text', required: true },
        { name: 'quantity', type: 'number', required: true, min: 1 },
        { name: 'unitPrice', type: 'number', required: true, min: 0 },
      ],
    },
    { name: 'subtotal', type: 'number', required: true, min: 0, access: { update: () => false } },
    { name: 'fees', type: 'number', required: true, min: 0, access: { update: () => false } },
    { name: 'serviceFeePercent', type: 'number', min: 0, access: { update: () => false } },
    { name: 'serviceFeeAmount', type: 'number', min: 0, access: { update: () => false } },
    { name: 'commissionPercent', type: 'number', min: 0, access: { update: () => false } },
    { name: 'commissionAmount', type: 'number', min: 0, access: { update: () => false } },
    { name: 'organizerEarnings', type: 'number', min: 0, access: { update: () => false } },
    { name: 'discountCode', type: 'text', access: { update: () => false } },
    { name: 'discountAmount', type: 'number', min: 0, access: { update: () => false } },
    {
      name: 'attendeeAnswers',
      type: 'array',
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'text', required: true },
      ],
    },
    { name: 'total', type: 'number', required: true, min: 0, access: { update: () => false } },
    {
      name: 'orderKind',
      type: 'select',
      defaultValue: 'paid',
      options: ['paid', 'free', 'complimentary'],
    },
    {
      name: 'purchaseMode',
      type: 'text',
      defaultValue: 'self',
      index: true,
    },
    { name: 'purchaserUser', type: 'relationship', relationTo: 'users', index: true },
    { name: 'giftRecipients', type: 'json' },
    {
      name: 'emailDeliveryStatus',
      type: 'text',
      defaultValue: 'pending',
    },
    { name: 'emailLastError', type: 'text' },
    { name: 'emailAttempts', type: 'number', defaultValue: 0 },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
      index: true,
    },
    { name: 'paidAt', type: 'date' },
  ],
}

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  admin: { group: 'Commerce', useAsTitle: 'providerReference' },
  access: {
    create: noPublicCreate,
    read: eventOwned,
    update: staffOnly,
    delete: superAdminOnly,
  },
  fields: [
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true },
    {
      name: 'provider',
      type: 'select',
      required: true,
      defaultValue: 'paystack',
      options: ['paystack'],
    },
    { name: 'providerReference', type: 'text', required: true, unique: true, index: true },
    { name: 'amount', type: 'number', required: true, min: 0 },
    { name: 'currency', type: 'text', required: true, defaultValue: 'NGN' },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: ['initialized', 'success', 'failed', 'refunded'],
    },
    { name: 'verifiedAt', type: 'date' },
  ],
}

export const Tickets: CollectionConfig = {
  slug: 'tickets',
  admin: { group: 'Ticketing', useAsTitle: 'code' },
  access: {
    create: noPublicCreate,
    read: eventOwned,
    update: eventOwned,
    delete: superAdminOnly,
  },
  fields: [
    { name: 'code', type: 'text', required: true, unique: true, index: true },
    { name: 'issuanceKey', type: 'text', unique: true, index: true },
    {
      name: 'verificationTokenHash',
      type: 'text',
      unique: true,
      index: true,
      admin: { hidden: true },
      access: { read: () => false },
    },
    {
      name: 'verificationTokenCiphertext',
      type: 'text',
      admin: { hidden: true },
      access: { read: () => false },
    },
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true, index: true },
    { name: 'ticketType', type: 'relationship', relationTo: 'ticket-types', required: false },
    { name: 'ticketLabel', type: 'text' },
    { name: 'attendeeName', type: 'text', required: true },
    { name: 'attendeeEmail', type: 'email', required: true, index: true },
    { name: 'attendeePhone', type: 'text' },
    {
      name: 'acquisitionType',
      type: 'text',
      defaultValue: 'self-purchase',
      index: true,
    },
    { name: 'purchaserName', type: 'text' },
    { name: 'purchaserEmail', type: 'email', index: true },
    { name: 'purchaserUser', type: 'relationship', relationTo: 'users', index: true },
    { name: 'giftMessage', type: 'textarea' },
    { name: 'peopleCovered', type: 'number', defaultValue: 1, min: 1 },
    { name: 'invitationLink', type: 'relationship', relationTo: 'free-ticket-links', index: true },
    {
      name: 'emailDeliveryStatus',
      type: 'text',
      defaultValue: 'pending',
    },
    { name: 'emailLastAttemptAt', type: 'date' },
    { name: 'emailLastError', type: 'text' },
    { name: 'emailAttempts', type: 'number', defaultValue: 0 },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'purchase',
      options: ['purchase', 'free-registration', 'free-claim', 'complimentary', 'guest-list'],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'valid',
      options: ['valid', 'used', 'cancelled', 'refunded', 'void'],
    },
    { name: 'checkedInAt', type: 'date' },
    { name: 'checkedInBy', type: 'relationship', relationTo: 'users' },
  ],
}

export const TeamMemberships: CollectionConfig = {
  slug: 'team-memberships',
  admin: { group: 'Operations', useAsTitle: 'email' },
  access: {
    create: ({ req }) => Boolean(getAppUser(req.user)),
    read: organizerOwned,
    update: organizerOwned,
    delete: organizerOwned,
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        const user = getAppUser(req.user)
        if (operation === 'create' && user && !isStaff(user)) data.organizer = user.id
        return data
      },
    ],
  },
  fields: [
    { name: 'organizer', type: 'relationship', relationTo: 'users', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      options: ['manager', 'check-in', 'analyst', 'finance'],
    },
    {
      name: 'permissions',
      type: 'select',
      hasMany: true,
      options: ['events', 'attendees', 'check-in', 'reports', 'finance'],
    },
    { name: 'assignedEvents', type: 'json' },
    {
      name: 'invitationStatus',
      type: 'select',
      defaultValue: 'pending',
      options: ['pending', 'accepted', 'revoked'],
    },
    { name: 'active', type: 'checkbox', required: true, defaultValue: true },
  ],
}

export const PayoutRequests: CollectionConfig = {
  slug: 'payout-requests',
  admin: { group: 'Finance', useAsTitle: 'reference' },
  access: {
    create: staffOnly,
    read: organizerOwned,
    update: staffOnly,
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        const user = getAppUser(req.user)
        if (operation === 'create' && user && !isStaff(user)) {
          data.organizer = user.id
          data.status = 'pending'
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'reference', type: 'text', required: true, unique: true, index: true },
    { name: 'idempotencyKey', type: 'text', unique: true, index: true },
    { name: 'organizer', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true, index: true },
    { name: 'amount', type: 'number', required: true, min: 1000 },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: ['pending', 'processing', 'approved', 'paid', 'failed', 'rejected'],
      index: true,
    },
    { name: 'initiatedBy', type: 'relationship', relationTo: 'users' },
    { name: 'initiatedByRole', type: 'text' },
    { name: 'reviewedBy', type: 'relationship', relationTo: 'users' },
    { name: 'reviewNote', type: 'textarea' },
    { name: 'reason', type: 'text' },
    { name: 'bankName', type: 'text' },
    { name: 'bankCode', type: 'text' },
    { name: 'accountNumber', type: 'text' },
    { name: 'accountName', type: 'text' },
    { name: 'paystackRecipientCode', type: 'text' },
    { name: 'paystackTransferCode', type: 'text' },
    { name: 'paystackTransferReference', type: 'text', index: true },
    { name: 'failureReason', type: 'textarea' },
    { name: 'providerPayload', type: 'json' },
    { name: 'paidAt', type: 'date' },
  ],
}

export const Refunds: CollectionConfig = {
  slug: 'refunds',
  admin: { group: 'Finance', useAsTitle: 'reference' },
  access: {
    create: staffOnly,
    read: eventOwned,
    update: staffOnly,
    delete: () => false,
  },
  fields: [
    { name: 'reference', type: 'text', required: true, unique: true, index: true },
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true, index: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true, index: true },
    { name: 'amount', type: 'number', required: true, min: 0 },
    { name: 'reason', type: 'textarea', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: ['pending', 'processed', 'failed'],
    },
    { name: 'initiatedBy', type: 'relationship', relationTo: 'users' },
    { name: 'paystackRefundId', type: 'text' },
    { name: 'paystackStatus', type: 'text' },
    { name: 'failureReason', type: 'textarea' },
    { name: 'processedAt', type: 'date' },
  ],
}

export const Complaints: CollectionConfig = {
  slug: 'complaints',
  admin: { group: 'Operations', useAsTitle: 'subject' },
  access: { create: () => false, read: staffOnly, update: staffOnly, delete: superAdminOnly },
  fields: [
    { name: 'subject', type: 'text', required: true },
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'message', type: 'textarea', required: true },
    { name: 'orderReference', type: 'text' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: ['open', 'investigating', 'resolved', 'closed'],
    },
    { name: 'internalNotes', type: 'textarea' },
  ],
}

export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  admin: { group: 'Marketing', useAsTitle: 'email' },
  access: {
    create: () => false,
    read: staffOnly,
    update: staffOnly,
    delete: superAdminOnly,
  },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'subscribed',
      options: ['subscribed', 'unsubscribed'],
    },
  ],
}

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  admin: { group: 'Operations', useAsTitle: 'summary' },
  access: {
    create: () => false,
    read: staffOnly,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'action', type: 'text', required: true, index: true },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        'auth',
        'event',
        'ticket',
        'bank',
        'appeal',
        'user',
        'payout',
        'refund',
        'admin',
        'settings',
      ],
    },
    { name: 'actor', type: 'relationship', relationTo: 'users' },
    { name: 'actorEmail', type: 'text' },
    { name: 'actorRole', type: 'text' },
    { name: 'targetCollection', type: 'text' },
    { name: 'targetId', type: 'text' },
    { name: 'summary', type: 'text', required: true },
    { name: 'metadata', type: 'json' },
  ],
}

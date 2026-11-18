import type { GlobalConfig } from 'payload'
import { isStaff, isSuperAdmin } from '@/access/appAccess'

export const PlatformSettings: GlobalConfig = {
  slug: 'platform-settings',
  admin: { group: 'Finance' },
  access: {
    read: ({ req }) => isStaff(req.user),
    update: ({ req }) => isSuperAdmin(req.user),
  },
  fields: [
    {
      name: 'commissionPercent',
      type: 'number',
      required: true,
      defaultValue: 5,
      min: 0,
      max: 100,
    },
    {
      name: 'serviceFeePercent',
      type: 'number',
      required: true,
      defaultValue: 2,
      min: 0,
      max: 100,
    },
    { name: 'emailDeliveryEnabled', type: 'checkbox', required: true, defaultValue: false },
    { name: 'minimumPayout', type: 'number', required: true, defaultValue: 10000, min: 0 },
    { name: 'supportEmail', type: 'email', required: true, defaultValue: 'support@azortix.com' },
    { name: 'salesEnabled', type: 'checkbox', required: true, defaultValue: true },
  ],
}

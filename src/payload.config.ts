import path from 'path'
import { buildConfig, type EmailAdapter } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { en as adminLanguage } from '@payloadcms/translations/languages/en'
import { fileURLToPath } from 'url'
import { getPgPoolConfig } from './lib/postgres'
import { migrations } from './migrations'
import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Folders } from './collections/Folders'
import { Tags } from './collections/Tags'
import { Users } from './collections/Users'
import { Events } from './collections/Events'
import { TicketTypes } from './collections/TicketTypes'
import { OrganizerProfiles } from './collections/OrganizerProfiles'
import {
  Announcements,
  BankChangeAppeals,
  BankVerifications,
  Discounts,
  EventCollections,
  FreeTicketLinks,
  GuestListEntries,
} from './collections/OrganizerOperations'
import {
  AuditLogs,
  Complaints,
  Subscribers,
  Orders,
  PayoutRequests,
  Refunds,
  TeamMemberships,
  Tickets,
  Transactions,
} from './collections/Operations'
import { PlatformSettings } from './globals/PlatformSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const azorEmail: EmailAdapter = () => ({
  name: 'azor-resend',
  defaultFromAddress: process.env.AZOR_EMAIL_FROM || 'noreply@azortix.com',
  defaultFromName: 'AZORTIX',
  sendEmail: async (message: any) => {
    if (!process.env.RESEND_API_KEY || !process.env.AZOR_EMAIL_FROM) {
      console.error('Transactional email configuration is incomplete', {
        missing: [
          !process.env.RESEND_API_KEY ? 'RESEND_API_KEY' : null,
          !process.env.AZOR_EMAIL_FROM ? 'AZOR_EMAIL_FROM' : null,
        ].filter(Boolean),
      })
      throw new Error('Transactional email is not configured.')
    }
    const recipients = Array.isArray(message.to) ? message.to : [message.to]
    const rawAttachments = Array.isArray(message.attachments) ? message.attachments : []
    const resendAttachments = rawAttachments
      .map((att: any) => {
        if (!att) return null
        const content = Buffer.isBuffer(att.content)
          ? att.content.toString('base64')
          : typeof att.content === 'string'
            ? att.content
            : null
        if (!content || !att.filename) return null
        const contentId = att.content_id || att.cid || att.contentId
        return {
          filename: String(att.filename),
          content,
          ...(att.contentType ? { content_type: String(att.contentType) } : {}),
          ...(contentId ? { content_id: String(contentId) } : {}),
        }
      })
      .filter(Boolean)

    const senderFrom = process.env.AZOR_EMAIL_FROM.includes('<')
      ? process.env.AZOR_EMAIL_FROM
      : `AZORTIX <${process.env.AZOR_EMAIL_FROM}>`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: senderFrom,
        to: recipients.filter(Boolean),
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(resendAttachments.length > 0 ? { attachments: resendAttachments } : {}),
      }),
    })
    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { message?: unknown } | null
      const providerMessage =
        typeof errorBody?.message === 'string' ? errorBody.message : 'Unknown Resend error'
      console.error('Resend delivery failed', {
        status: response.status,
        message: providerMessage,
      })
      throw new Error(`Transactional email delivery failed: ${providerMessage}`)
    }
    return response.json()
  },
})

const shouldAllowDdl = process.env.PAYLOAD_ALLOW_DDL === 'true'

export default buildConfig({
  admin: {
    user: Admins.slug,
    constrainWidth: true,
    dashboard: {
      widgets: [],
      defaultLayout: [
        { widgetSlug: 'activity', width: 'full' },
        { widgetSlug: 'collections', width: 'full' },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: { en: adminLanguage },
  },
  collections: [
    Admins,
    Media,
    Folders,
    Tags,
    Users,
    Events,
    TicketTypes,
    OrganizerProfiles,
    Discounts,
    GuestListEntries,
    Announcements,
    EventCollections,
    BankVerifications,
    BankChangeAppeals,
    FreeTicketLinks,
    Orders,
    Transactions,
    Tickets,
    TeamMemberships,
    PayoutRequests,
    Refunds,
    Complaints,
    Subscribers,
    AuditLogs,
  ],
  globals: [PlatformSettings],
  db: postgresAdapter({
    pool: getPgPoolConfig(shouldAllowDdl) as any,
    idType: 'uuid',
    push: shouldAllowDdl,
    allowIDOnCreate: process.env.PAYLOAD_ALLOW_ID_ON_CREATE === 'true',
    migrationDir: path.resolve(dirname, 'migrations'),
    prodMigrations: migrations,
  }),
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'azor-tix-local-dev-secret',
  email: azorEmail,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  localization: {
    locales: [{ code: 'en', label: 'English' }],
    fallback: true,
    defaultLocale: 'en',
  },
  plugins: [mcpPlugin({})],
})

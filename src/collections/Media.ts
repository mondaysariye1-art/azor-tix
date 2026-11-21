import fs from 'node:fs/promises'
import path from 'node:path'
import type { CollectionConfig } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createFolderField, createTagField } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { getPgPool, isPostgresConfigured } from '@/lib/postgres'

const MEDIA_DIR = path.resolve(process.cwd(), 'media')
const FALLBACK_MEDIA_PATH = path.resolve(
  process.cwd(),
  'public/assets/aistudio/image_2d960078.png',
)
const MAX_DB_BLOB_BYTES = 10 * 1024 * 1024

async function resolveMissingMediaResponse(
  doc: unknown,
  filename?: string,
): Promise<Response | null> {
  const safeFilename = path.basename(filename || '')
  const filePath = path.resolve(MEDIA_DIR, safeFilename)
  if (!filePath.startsWith(MEDIA_DIR + path.sep)) {
    return null
  }

  try {
    await fs.stat(filePath)
    return null
  } catch {
    // File missing from ephemeral container disk; restore from DB blob or serve fallback
  }

  const docRecord = doc as { id?: string | number; mimeType?: string } | null | undefined
  if (docRecord?.id && isPostgresConfigured()) {
    try {
      const pool = getPgPool(false)
      const result = await pool.query<{ data: Buffer; mime_type: string | null }>(
        'SELECT "data", "mime_type" FROM "media_blobs" WHERE "media_id" = $1 LIMIT 1',
        [docRecord.id],
      )
      const row = result.rows[0]
      if (row?.data) {
        await fs.mkdir(MEDIA_DIR, { recursive: true }).catch(() => {})
        await fs.writeFile(filePath, row.data).catch(() => {})
        const contentType =
          row.mime_type || docRecord.mimeType || 'application/octet-stream'
        return new Response(new Uint8Array(row.data), {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(row.data.length),
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        })
      }
    } catch (error) {
      console.error('[media] failed to load media blob fallback:', error)
    }
  }

  try {
    const fallbackBuffer = await fs.readFile(FALLBACK_MEDIA_PATH)
    return new Response(new Uint8Array(fallbackBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(fallbackBuffer.length),
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch {
    return null
  }
}

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        if (req.file?.data && doc?.id && isPostgresConfigured()) {
          const buf = Buffer.isBuffer(req.file.data)
            ? req.file.data
            : Buffer.from(req.file.data)
          if (buf.length > 0 && buf.length <= MAX_DB_BLOB_BYTES) {
            try {
              const dbAdapter = req.payload.db as {
                drizzle?: { execute: (q: ReturnType<typeof sql>) => Promise<unknown> }
                sessions?: Record<
                  string | number,
                  { db?: { execute: (q: ReturnType<typeof sql>) => Promise<unknown> } }
                >
              }
              const txKey = req.transactionID as string | number | undefined
              const sessionClient = txKey !== undefined ? dbAdapter?.sessions?.[txKey] : undefined
              const executor =
                sessionClient && 'execute' in sessionClient
                  ? (sessionClient as unknown as { execute: (q: ReturnType<typeof sql>) => Promise<unknown> })
                  : sessionClient?.db || dbAdapter?.drizzle
              const mimeType =
                req.file.mimetype || (doc as any).mimeType || 'application/octet-stream'
              if (executor) {
                await executor.execute(
                  sql`INSERT INTO "media_blobs" ("media_id", "mime_type", "data", "updated_at")
                      VALUES (${doc.id}, ${mimeType}, ${buf}, now())
                      ON CONFLICT ("media_id") DO UPDATE
                        SET "mime_type" = EXCLUDED."mime_type",
                            "data" = EXCLUDED."data",
                            "updated_at" = now()`,
                )
              }
            } catch (error) {
              console.error('[media] failed to persist media blob:', error)
            }
          }
        }

        const events = await req.payload.find({
          collection: 'events',
          overrideAccess: true,
          where: {
            or: [{ heroImage: { equals: doc.id } }, { gallery: { equals: doc.id } }],
          },
          limit: 100,
          depth: 0,
        })
        for (const event of events.docs) {
          revalidateTag('public-events', 'max')
          if (event.slug) {
            revalidateTag(`event:${event.slug}`, 'max')
            revalidatePath(`/events/${event.slug}`)
          }
        }
        const profiles = await req.payload.find({
          collection: 'organizer-profiles',
          overrideAccess: true,
          where: { logo: { equals: doc.id } },
          limit: 100,
          depth: 0,
        })
        for (const profile of profiles.docs) {
          revalidateTag('organizer-profiles', 'max')
          if (profile.slug) {
            revalidateTag(`organizer:${profile.slug}`, 'max')
            revalidatePath(`/organizers/${profile.slug}`)
          }
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    createFolderField({ relationTo: 'folders' }),
    createTagField({ relationTo: 'tags' }),
  ],
  upload: {
    handlers: [
      async (_req, { doc, params }) =>
        (await resolveMissingMediaResponse(doc, params.filename)) as Response,
    ],
    modifyResponseHeaders: ({ headers }) => {
      headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600')
      return headers
    },
  },
}

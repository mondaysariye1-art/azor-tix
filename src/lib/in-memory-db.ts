import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import {
  createDatabaseAdapter,
  type BaseDatabaseAdapter,
  type DatabaseAdapterObj,
  type Payload,
  type Where,
} from 'payload'

type Doc = Record<string, any>

type InMemoryStore = {
  collections: Map<string, Map<string, Doc>>
  versions: Map<string, Doc[]>
  globals: Map<string, Doc>
  globalVersions: Map<string, Doc[]>
}

const STORE_FILE_PATH = path.resolve(process.cwd(), '.tmp', 'azor-tix-store.json')

const globalForStore = globalThis as unknown as {
  __azorInMemoryStore?: InMemoryStore
  __azorStoreMtimeMs?: number
}

function hydrateStoreFromSnapshot(store: InMemoryStore, raw: string) {
  const parsed = JSON.parse(raw) as {
    collections?: Record<string, Array<[string, Doc]>>
    versions?: Record<string, Doc[]>
    globals?: Record<string, Doc>
    globalVersions?: Record<string, Doc[]>
  }
  store.collections.clear()
  if (parsed.collections) {
    for (const [slug, entries] of Object.entries(parsed.collections)) {
      store.collections.set(slug, new Map(entries))
    }
  }
  store.versions.clear()
  if (parsed.versions) {
    for (const [slug, list] of Object.entries(parsed.versions)) {
      store.versions.set(slug, list)
    }
  }
  store.globals.clear()
  if (parsed.globals) {
    for (const [slug, doc] of Object.entries(parsed.globals)) {
      store.globals.set(slug, doc)
    }
  }
  store.globalVersions.clear()
  if (parsed.globalVersions) {
    for (const [slug, list] of Object.entries(parsed.globalVersions)) {
      store.globalVersions.set(slug, list)
    }
  }
}

function syncStoreFromDisk(store: InMemoryStore) {
  try {
    if (!fs.existsSync(STORE_FILE_PATH)) return
    const stat = fs.statSync(STORE_FILE_PATH)
    if (globalForStore.__azorStoreMtimeMs === stat.mtimeMs) return
    const raw = fs.readFileSync(STORE_FILE_PATH, 'utf8')
    if (raw.trim()) {
      hydrateStoreFromSnapshot(store, raw)
    }
    globalForStore.__azorStoreMtimeMs = stat.mtimeMs
  } catch {
    // Fallback gracefully to in-memory state if filesystem is unavailable
  }
}

function persistStoreToDisk(store: InMemoryStore) {
  try {
    const dir = path.dirname(STORE_FILE_PATH)
    fs.mkdirSync(dir, { recursive: true })
    const snapshot = {
      collections: Object.fromEntries(
        Array.from(store.collections.entries(), ([slug, map]) => [slug, Array.from(map.entries())]),
      ),
      versions: Object.fromEntries(store.versions.entries()),
      globals: Object.fromEntries(store.globals.entries()),
      globalVersions: Object.fromEntries(store.globalVersions.entries()),
    }
    const tmpFile = `${STORE_FILE_PATH}.${process.pid}.${Date.now()}.tmp`
    fs.writeFileSync(tmpFile, JSON.stringify(snapshot), 'utf8')
    fs.renameSync(tmpFile, STORE_FILE_PATH)
    globalForStore.__azorStoreMtimeMs = fs.statSync(STORE_FILE_PATH).mtimeMs
  } catch {
    // Ignore persistence write errors in read-only runtimes
  }
}

function getStore(): InMemoryStore {
  if (!globalForStore.__azorInMemoryStore) {
    globalForStore.__azorInMemoryStore = {
      collections: new Map(),
      versions: new Map(),
      globals: new Map(),
      globalVersions: new Map(),
    }
    syncStoreFromDisk(globalForStore.__azorInMemoryStore)
  }
  return globalForStore.__azorInMemoryStore
}

function clone<T>(value: T): T {
  if (value === undefined) return value
  return structuredClone(value)
}

function getCollectionMap(store: InMemoryStore, slug: string): Map<string, Doc> {
  let map = store.collections.get(slug)
  if (!map) {
    map = new Map()
    store.collections.set(slug, map)
  }
  return map
}

function getVersionList(store: InMemoryStore, slug: string): Doc[] {
  let list = store.versions.get(slug)
  if (!list) {
    list = []
    store.versions.set(slug, list)
  }
  return list
}

function getGlobalVersionList(store: InMemoryStore, slug: string): Doc[] {
  let list = store.globalVersions.get(slug)
  if (!list) {
    list = []
    store.globalVersions.set(slug, list)
  }
  return list
}

function resolveFieldRelation(
  payload: BaseDatabaseAdapter['payload'],
  collectionSlug: string,
  fieldName: string,
): string | null {
  const collections = payload?.collections as Record<string, any> | undefined
  const col = collections?.[collectionSlug]?.config
  if (!col) return null
  const fields = col.flattenedFields || col.fields || []
  const field = fields.find((f: any) => 'name' in f && f.name === fieldName) as any
  if (!field) return null
  if (typeof field.relationTo === 'string') return field.relationTo
  if (Array.isArray(field.relationTo) && field.relationTo.length > 0) {
    return typeof field.relationTo[0] === 'string' ? field.relationTo[0] : null
  }
  return null
}

function resolvePathValues(
  doc: Doc,
  pathParts: string[],
  store: InMemoryStore,
  payload: BaseDatabaseAdapter['payload'],
  collectionSlug?: string,
): any[] {
  if (!doc || typeof doc !== 'object') return []
  if (pathParts.length === 0) return [doc]

  const [head, ...rest] = pathParts
  const current = doc[head]

  if (rest.length === 0) {
    if (Array.isArray(current)) return current
    return [current]
  }

  const nextValues: any[] = []
  const items = Array.isArray(current) ? current : [current]

  for (const item of items) {
    if (item == null) continue
    if (typeof item === 'object') {
      if ('value' in item && 'relationTo' in item && typeof item.relationTo === 'string') {
        const relId = typeof item.value === 'object' ? item.value?.id : item.value
        const relDoc = relId != null ? getCollectionMap(store, item.relationTo).get(String(relId)) : null
        if (relDoc) {
          nextValues.push(...resolvePathValues(relDoc, rest, store, payload, item.relationTo))
        }
      } else {
        nextValues.push(...resolvePathValues(item, rest, store, payload, undefined))
      }
    } else if (collectionSlug) {
      const relationTo = resolveFieldRelation(payload, collectionSlug, head)
      if (relationTo) {
        const relDoc = getCollectionMap(store, relationTo).get(String(item))
        if (relDoc) {
          nextValues.push(...resolvePathValues(relDoc, rest, store, payload, relationTo))
        }
      }
    }
  }

  return nextValues
}

function normalizeComparable(val: any): any {
  if (val instanceof Date) return val.toISOString()
  if (val && typeof val === 'object' && 'id' in val) return val.id
  return val
}

function matchOperator(actualList: any[], operator: string, expected: any): boolean {
  const values = actualList.length > 0 ? actualList : [undefined]

  switch (operator) {
    case 'equals':
      return values.some((v) => {
        const a = normalizeComparable(v)
        const b = normalizeComparable(expected)
        if (a === b) return true
        if (a != null && b != null && String(a) === String(b) && (typeof a === 'number' || typeof b === 'number')) {
          return Number(a) === Number(b)
        }
        return false
      })
    case 'not_equals':
      return !values.some((v) => normalizeComparable(v) === normalizeComparable(expected))
    case 'in': {
      const arr = Array.isArray(expected) ? expected.map(normalizeComparable) : []
      return values.some((v) => arr.includes(normalizeComparable(v)))
    }
    case 'not_in': {
      const arr = Array.isArray(expected) ? expected.map(normalizeComparable) : []
      return !values.some((v) => arr.includes(normalizeComparable(v)))
    }
    case 'exists': {
      const exists = values.some((v) => v !== undefined && v !== null)
      return expected ? exists : !exists
    }
    case 'like':
    case 'contains': {
      const needle = String(expected ?? '').toLowerCase()
      return values.some((v) => String(v ?? '').toLowerCase().includes(needle))
    }
    case 'greater_than':
      return values.some((v) => v != null && normalizeComparable(v) > normalizeComparable(expected))
    case 'greater_than_equal':
      return values.some((v) => v != null && normalizeComparable(v) >= normalizeComparable(expected))
    case 'less_than':
      return values.some((v) => v != null && normalizeComparable(v) < normalizeComparable(expected))
    case 'less_than_equal':
      return values.some((v) => v != null && normalizeComparable(v) <= normalizeComparable(expected))
    case 'all': {
      const expectedArr = Array.isArray(expected) ? expected : [expected]
      return expectedArr.every((exp) =>
        values.some((v) => normalizeComparable(v) === normalizeComparable(exp)),
      )
    }
    default:
      return true
  }
}

function matchesWhere(
  doc: Doc,
  where: Where | undefined,
  store: InMemoryStore,
  payload: BaseDatabaseAdapter['payload'],
  collectionSlug?: string,
): boolean {
  if (!where || Object.keys(where).length === 0) return true

  for (const [key, value] of Object.entries(where)) {
    if (key === 'and' && Array.isArray(value)) {
      if (!value.every((sub) => matchesWhere(doc, sub, store, payload, collectionSlug))) {
        return false
      }
      continue
    }
    if (key === 'or' && Array.isArray(value)) {
      if (!value.some((sub) => matchesWhere(doc, sub, store, payload, collectionSlug))) {
        return false
      }
      continue
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const actualValues = resolvePathValues(doc, key.split('.'), store, payload, collectionSlug)
      for (const [op, expected] of Object.entries(value)) {
        if (!matchOperator(actualValues, op, expected)) {
          return false
        }
      }
    }
  }
  return true
}

function sortDocs(docs: Doc[], sort: string | string[] | undefined): Doc[] {
  if (!sort) return docs
  const fields = Array.isArray(sort) ? sort : [sort]
  return [...docs].sort((a, b) => {
    for (const rawField of fields) {
      const desc = rawField.startsWith('-')
      const field = desc ? rawField.slice(1) : rawField
      const aVal = field.split('.').reduce<any>((acc, k) => acc?.[k], a)
      const bVal = field.split('.').reduce<any>((acc, k) => acc?.[k], b)
      if (aVal === bVal) continue
      if (aVal == null) return desc ? 1 : -1
      if (bVal == null) return desc ? -1 : 1
      const cmp = aVal < bVal ? -1 : 1
      return desc ? -cmp : cmp
    }
    return 0
  })
}

function paginate<T>(allDocs: T[], limitArg?: number, pageArg?: number, pagination = true) {
  const totalDocs = allDocs.length
  const page = Math.max(1, pageArg ?? 1)
  const effectiveLimit = !pagination || limitArg === 0 ? Math.max(totalDocs, 1) : (limitArg ?? 10)
  const start = !pagination || limitArg === 0 ? 0 : (page - 1) * effectiveLimit
  const docs = !pagination || limitArg === 0 ? allDocs : allDocs.slice(start, start + effectiveLimit)
  const totalPages = effectiveLimit > 0 ? Math.max(1, Math.ceil(totalDocs / effectiveLimit)) : 1
  const hasPrevPage = page > 1
  const hasNextPage = page < totalPages

  return {
    docs,
    hasNextPage,
    hasPrevPage,
    limit: !pagination || limitArg === 0 ? 0 : effectiveLimit,
    nextPage: hasNextPage ? page + 1 : null,
    page,
    pagingCounter: totalDocs === 0 ? 0 : start + 1,
    prevPage: hasPrevPage ? page - 1 : null,
    totalDocs,
    totalPages,
  }
}

export function inMemoryDatabaseAdapter(): DatabaseAdapterObj {
  return {
    name: 'in-memory',
    defaultIDType: 'text',
    init: ({ payload }: { payload: Payload }) => {
      const store = getStore()

      return createDatabaseAdapter({
        name: 'in-memory',
        packageName: 'in-memory-adapter',
        defaultIDType: 'text',
        allowIDOnCreate: true,
        payload,
        init: async () => {},
        connect: async () => {},
        destroy: async () => {},
        beginTransaction: async () => null,
        commitTransaction: async () => {},
        rollbackTransaction: async () => {},

        find: async ({ collection, limit, page, pagination, sort, where }) => {
          syncStoreFromDisk(store)
          const map = getCollectionMap(store, collection)
          const matched = Array.from(map.values())
            .filter((doc) => matchesWhere(doc, where, store, payload, collection))
          const sorted = sortDocs(matched, sort).map((doc) => clone(doc))
          return paginate(sorted, limit, page, pagination) as any
        },

        findOne: async ({ collection, where }) => {
          syncStoreFromDisk(store)
          const map = getCollectionMap(store, collection)
          for (const doc of map.values()) {
            if (matchesWhere(doc, where, store, payload, collection)) {
              return clone(doc) as any
            }
          }
          return null
        },

        count: async ({ collection, where }) => {
          syncStoreFromDisk(store)
          const map = getCollectionMap(store, collection)
          let totalDocs = 0
          for (const doc of map.values()) {
            if (matchesWhere(doc, where, store, payload, collection)) {
              totalDocs += 1
            }
          }
          return { totalDocs }
        },

        create: async ({ collection, customID, data }) => {
          syncStoreFromDisk(store)
          const map = getCollectionMap(store, collection)
          const now = new Date().toISOString()
          const id = String(customID ?? data.id ?? crypto.randomUUID())
          const doc = clone({
            ...data,
            id,
            createdAt: data.createdAt || now,
            updatedAt: data.updatedAt || now,
          })
          map.set(id, doc)
          persistStoreToDisk(store)
          return clone(doc)
        },

        updateOne: async ({ collection, data, id, where }) => {
          syncStoreFromDisk(store)
          const map = getCollectionMap(store, collection)
          const targetWhere: Where | undefined =
            id != null ? { id: { equals: String(id) } } : where
          for (const [docId, existing] of map.entries()) {
            if (matchesWhere(existing, targetWhere, store, payload, collection)) {
              const updated = clone({
                ...existing,
                ...data,
                id: existing.id,
                updatedAt: new Date().toISOString(),
              })
              map.set(docId, updated)
              persistStoreToDisk(store)
              return clone(updated)
            }
          }
          return null as any
        },

        updateMany: async ({ collection, data, limit, sort, where }) => {
          syncStoreFromDisk(store)
          const map = getCollectionMap(store, collection)
          let matched = Array.from(map.values()).filter((doc) =>
            matchesWhere(doc, where, store, payload, collection),
          )
          matched = sortDocs(matched, sort)
          if (limit && limit > 0) matched = matched.slice(0, limit)
          const results: Doc[] = []
          const now = new Date().toISOString()
          for (const existing of matched) {
            const updated = clone({
              ...existing,
              ...data,
              id: existing.id,
              updatedAt: now,
            })
            map.set(String(existing.id), updated)
            results.push(clone(updated))
          }
          if (results.length > 0) persistStoreToDisk(store)
          return results
        },

        upsert: async ({ collection, data, where }) => {
          syncStoreFromDisk(store)
          const map = getCollectionMap(store, collection)
          for (const [docId, existing] of map.entries()) {
            if (matchesWhere(existing, where, store, payload, collection)) {
              const updated = clone({
                ...existing,
                ...data,
                id: existing.id,
                updatedAt: new Date().toISOString(),
              })
              map.set(docId, updated)
              persistStoreToDisk(store)
              return clone(updated)
            }
          }
          const now = new Date().toISOString()
          const id = String(data.id ?? (where as any)?.id?.equals ?? crypto.randomUUID())
          const created = clone({
            ...data,
            id,
            createdAt: data.createdAt || now,
            updatedAt: data.updatedAt || now,
          })
          map.set(id, created)
          persistStoreToDisk(store)
          return clone(created)
        },

        deleteOne: async ({ collection, where }) => {
          syncStoreFromDisk(store)
          const map = getCollectionMap(store, collection)
          for (const [docId, existing] of map.entries()) {
            if (matchesWhere(existing, where, store, payload, collection)) {
              map.delete(docId)
              persistStoreToDisk(store)
              return clone(existing)
            }
          }
          return null as any
        },

        deleteMany: async ({ collection, where }) => {
          syncStoreFromDisk(store)
          const map = getCollectionMap(store, collection)
          let changed = false
          for (const [docId, existing] of map.entries()) {
            if (matchesWhere(existing, where, store, payload, collection)) {
              map.delete(docId)
              changed = true
            }
          }
          if (changed) persistStoreToDisk(store)
        },

        findDistinct: async ({ collection, field, limit, page, sort, where }) => {
          syncStoreFromDisk(store)
          const map = getCollectionMap(store, collection)
          const matched = sortDocs(
            Array.from(map.values()).filter((doc) =>
              matchesWhere(doc, where, store, payload, collection),
            ),
            sort,
          )
          const seen = new Set<string>()
          const values: Record<string, any>[] = []
          for (const doc of matched) {
            const raw = field.split('.').reduce<any>((acc, k) => acc?.[k], doc)
            const key = JSON.stringify(raw)
            if (!seen.has(key)) {
              seen.add(key)
              values.push({ [field]: clone(raw) })
            }
          }
          const paged = paginate(values, limit, page, true)
          return {
            hasNextPage: paged.hasNextPage,
            hasPrevPage: paged.hasPrevPage,
            limit: paged.limit,
            nextPage: paged.nextPage,
            page: paged.page,
            pagingCounter: paged.pagingCounter,
            prevPage: paged.prevPage,
            totalDocs: paged.totalDocs,
            totalPages: paged.totalPages,
            values: paged.docs,
          }
        },

        findVersions: async ({ collection, limit, page, pagination, sort, where }) => {
          syncStoreFromDisk(store)
          const list = getVersionList(store, collection)
          const matched = list.filter((v) => matchesWhere(v, where, store, payload))
          const sorted = sortDocs(matched, sort || '-updatedAt').map((v) => clone(v))
          return paginate(sorted, limit, page, pagination) as any
        },

        countVersions: async ({ collection, where }) => {
          syncStoreFromDisk(store)
          const list = getVersionList(store, collection)
          const totalDocs = list.filter((v) => matchesWhere(v, where, store, payload)).length
          return { totalDocs }
        },

        createVersion: async ({
          autosave,
          collectionSlug,
          createdAt,
          parent,
          publishedLocale,
          snapshot,
          updatedAt,
          versionData,
        }) => {
          syncStoreFromDisk(store)
          const list = getVersionList(store, collectionSlug)
          const versionDoc: Doc = clone({
            id: crypto.randomUUID(),
            parent: String(parent),
            autosave: Boolean(autosave),
            latest: true,
            publishedLocale,
            snapshot,
            createdAt,
            updatedAt,
            version: versionData,
          })
          for (const existing of list) {
            if (String(existing.parent) === String(parent)) {
              existing.latest = false
            }
          }
          list.push(versionDoc)
          persistStoreToDisk(store)
          return clone(versionDoc) as any
        },

        updateVersion: async ({ collection, id, versionData, where }) => {
          syncStoreFromDisk(store)
          const list = getVersionList(store, collection)
          const targetWhere: Where | undefined =
            id != null ? { id: { equals: String(id) } } : where
          for (let i = 0; i < list.length; i += 1) {
            if (matchesWhere(list[i], targetWhere, store, payload)) {
              const updated = clone({
                ...list[i],
                ...versionData,
                updatedAt: versionData.updatedAt || new Date().toISOString(),
              })
              list[i] = updated
              persistStoreToDisk(store)
              return clone(updated) as any
            }
          }
          return null as any
        },

        deleteVersions: async ({ collection, globalSlug, where }) => {
          syncStoreFromDisk(store)
          if (collection) {
            const list = getVersionList(store, collection)
            store.versions.set(
              collection,
              list.filter((v) => !matchesWhere(v, where, store, payload)),
            )
            persistStoreToDisk(store)
          } else if (globalSlug) {
            const list = getGlobalVersionList(store, globalSlug)
            store.globalVersions.set(
              globalSlug,
              list.filter((v) => !matchesWhere(v, where, store, payload)),
            )
            persistStoreToDisk(store)
          }
        },

        queryDrafts: async ({ collection, limit, page, pagination, sort, where }) => {
          syncStoreFromDisk(store)
          const list = getVersionList(store, collection)
          const mainMap = getCollectionMap(store, collection)
          const latestVersions = list.filter((v) => v.latest === true)
          const seenParents = new Set(latestVersions.map((v) => String(v.parent)))
          const candidates: Doc[] = latestVersions.map((v) => ({
            ...v.version,
            id: v.parent,
            createdAt: v.version?.createdAt || v.createdAt,
            updatedAt: v.version?.updatedAt || v.updatedAt,
            latest: true,
            parent: v.parent,
            version: v.version,
          }))
          for (const doc of mainMap.values()) {
            if (!seenParents.has(String(doc.id))) {
              candidates.push({
                ...doc,
                latest: true,
                parent: doc.id,
                version: doc,
              })
            }
          }
          const matched = candidates.filter((doc) =>
            matchesWhere(doc, where, store, payload, collection),
          )
          const sorted = sortDocs(matched, sort).map((doc) => {
            const { latest: _l, parent: _p, version: _v, ...clean } = doc
            return clone(clean)
          })
          return paginate(sorted, limit, page, pagination) as any
        },

        createGlobal: async ({ data, slug }) => {
          syncStoreFromDisk(store)
          const doc = clone({
            ...data,
            globalType: slug,
            updatedAt: new Date().toISOString(),
          })
          store.globals.set(slug, doc)
          persistStoreToDisk(store)
          return clone(doc)
        },

        findGlobal: async ({ slug }) => {
          syncStoreFromDisk(store)
          const doc = store.globals.get(slug)
          return (doc ? clone(doc) : {}) as any
        },

        updateGlobal: async ({ data, slug }) => {
          syncStoreFromDisk(store)
          const existing = store.globals.get(slug) || {}
          const doc = clone({
            ...existing,
            ...data,
            globalType: slug,
            updatedAt: new Date().toISOString(),
          })
          store.globals.set(slug, doc)
          persistStoreToDisk(store)
          return clone(doc)
        },

        findGlobalVersions: async ({ global, limit, page, pagination, sort, where }) => {
          syncStoreFromDisk(store)
          const list = getGlobalVersionList(store, global)
          const matched = list.filter((v) => matchesWhere(v, where, store, payload))
          const sorted = sortDocs(matched, sort || '-updatedAt').map((v) => clone(v))
          return paginate(sorted, limit, page, pagination) as any
        },

        countGlobalVersions: async ({ global, where }) => {
          syncStoreFromDisk(store)
          const list = getGlobalVersionList(store, global)
          const totalDocs = list.filter((v) => matchesWhere(v, where, store, payload)).length
          return { totalDocs }
        },

        createGlobalVersion: async ({
          autosave,
          createdAt,
          globalSlug,
          publishedLocale,
          snapshot,
          updatedAt,
          versionData,
        }) => {
          syncStoreFromDisk(store)
          const list = getGlobalVersionList(store, globalSlug)
          const versionDoc: Doc = clone({
            id: crypto.randomUUID(),
            autosave: Boolean(autosave),
            latest: true,
            publishedLocale,
            snapshot,
            createdAt,
            updatedAt,
            version: versionData,
          })
          for (const existing of list) {
            existing.latest = false
          }
          list.push(versionDoc)
          persistStoreToDisk(store)
          return clone(versionDoc) as any
        },

        updateGlobalVersion: async ({ global, id, versionData, where }) => {
          syncStoreFromDisk(store)
          const list = getGlobalVersionList(store, global)
          const targetWhere: Where | undefined =
            id != null ? { id: { equals: String(id) } } : where
          for (let i = 0; i < list.length; i += 1) {
            if (matchesWhere(list[i], targetWhere, store, payload)) {
              const updated = clone({
                ...list[i],
                ...versionData,
                updatedAt: versionData.updatedAt || new Date().toISOString(),
              })
              list[i] = updated
              persistStoreToDisk(store)
              return clone(updated) as any
            }
          }
          return null as any
        },

        updateJobs: async ({ data, id, limit, returning, sort, where }) => {
          syncStoreFromDisk(store)
          const map = getCollectionMap(store, 'payload-jobs')
          const targetWhere: Where | undefined =
            id != null ? { id: { equals: String(id) } } : where
          let matched = Array.from(map.values()).filter((doc) =>
            matchesWhere(doc, targetWhere, store, payload, 'payload-jobs'),
          )
          matched = sortDocs(matched, sort || '-updatedAt')
          if (limit && limit > 0) matched = matched.slice(0, limit)
          const results: any[] = []
          const now = new Date().toISOString()
          for (const existing of matched) {
            const updated = clone({
              ...existing,
              ...data,
              id: existing.id,
              updatedAt: now,
            })
            map.set(String(existing.id), updated)
            results.push(clone(updated))
          }
          if (results.length > 0) persistStoreToDisk(store)
          return returning === false ? null : results
        },
      })
    },
  }
}

import { Pool, type PoolClient, type PoolConfig } from 'pg'

const globalForPg = globalThis as unknown as {
  __azorPgPool?: Pool
  __azorPgAdminPool?: Pool
}

export function isPostgresConfigured(): boolean {
  return Boolean(
    process.env.SQL_HOST &&
      process.env.SQL_DB_NAME &&
      (process.env.SQL_USER || process.env.SQL_ADMIN_USER) &&
      (process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD),
  )
}

export function getPgPoolConfig(preferAdmin = false): PoolConfig {
  const user = preferAdmin
    ? process.env.SQL_ADMIN_USER || process.env.SQL_USER
    : process.env.SQL_USER || process.env.SQL_ADMIN_USER
  const password = preferAdmin
    ? process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD
    : process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD

  return {
    host: process.env.SQL_HOST,
    database: process.env.SQL_DB_NAME,
    user,
    password,
    max: preferAdmin ? 5 : 8,
    min: 0,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 45000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    allowExitOnIdle: true,
  }
}

export function getPgPool(preferAdmin = false): Pool {
  if (preferAdmin) {
    if (!globalForPg.__azorPgAdminPool) {
      const pool = new Pool(getPgPoolConfig(true))
      pool.on('error', (error) => {
        console.error('[pg-admin-pool] unexpected idle client error:', error.message)
      })
      globalForPg.__azorPgAdminPool = pool
    }
    return globalForPg.__azorPgAdminPool
  }
  if (!globalForPg.__azorPgPool) {
    const pool = new Pool(getPgPoolConfig(false))
    pool.on('error', (error) => {
      console.error('[pg-pool] unexpected idle client error:', error.message)
    })
    globalForPg.__azorPgPool = pool
  }
  return globalForPg.__azorPgPool
}

const PG_CONNECT_RETRY_DELAYS_MS = [400, 900, 1800, 3200]

function isTransientPgConnectError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? `${error.message} ${String((error as any).code || '')}`
      : String(error || '')
  return /recovery mode|starting up|terminating connection|57P01|57P03|ECONNRESET|ECONNREFUSED|timeout exceeded|Connection terminated/i.test(
    msg,
  )
}

async function connectWithRetry(pool: Pool): Promise<PoolClient> {
  let lastError: unknown
  for (let attempt = 0; attempt <= PG_CONNECT_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await pool.connect()
    } catch (error) {
      lastError = error
      if (!isTransientPgConnectError(error) || attempt === PG_CONNECT_RETRY_DELAYS_MS.length) {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, PG_CONNECT_RETRY_DELAYS_MS[attempt]))
    }
  }
  throw lastError
}

/**
 * Serializes critical multi-step operations (ticket checkout inventory reservation,
 * free claim redemption, payment finalization, Paystack transfers) across concurrent
 * requests using PostgreSQL transaction-scoped advisory locks.
 */
export async function withTransactionLocked<T>(
  lockKey: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  if (!isPostgresConfigured()) {
    throw new Error('PostgreSQL database connection is not configured.')
  }
  const pool = getPgPool(false)
  const client = await connectWithRetry(pool)
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lockKey])
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

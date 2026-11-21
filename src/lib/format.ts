export const DEFAULT_LOCALE = 'en-NG'
export const DEFAULT_TIMEZONE = 'Africa/Lagos'

export function resolveTimeZone(timeZone?: string | null): string {
  const candidate = typeof timeZone === 'string' ? timeZone.trim() : ''
  if (!candidate) return DEFAULT_TIMEZONE
  try {
    new Intl.DateTimeFormat(DEFAULT_LOCALE, { timeZone: candidate })
    return candidate
  } catch {
    return DEFAULT_TIMEZONE
  }
}

function toValidDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.valueOf()) ? date : null
}

/**
 * Deterministic date + time string (DD/MM/YYYY, HH:mm) using a fixed locale and
 * explicit IANA timezone so server-rendered HTML and client hydration match identically.
 */
export function formatDateTime(
  value: string | number | Date | null | undefined,
  timeZone?: string | null,
  fallback = 'Not set',
): string {
  const date = toValidDate(value)
  if (!date) return fallback
  const tz = resolveTimeZone(timeZone)
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: tz,
  }).format(date)
}

/**
 * Deterministic medium date + short time (e.g. "28 Nov 2026, 12:41") using explicit timezone.
 */
export function formatReadableDateTime(
  value: string | number | Date | null | undefined,
  timeZone?: string | null,
  fallback = 'Not set',
): string {
  const date = toValidDate(value)
  if (!date) return fallback
  const tz = resolveTimeZone(timeZone)
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: tz,
  }).format(date)
}

/**
 * Deterministic date-only string (DD/MM/YYYY) using explicit timezone.
 */
export function formatDate(
  value: string | number | Date | null | undefined,
  timeZone?: string | null,
  fallback = '—',
): string {
  const date = toValidDate(value)
  if (!date) return fallback
  const tz = resolveTimeZone(timeZone)
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: tz,
  }).format(date)
}

/**
 * Deterministic time-only string (HH:mm or HH:mm:ss) using explicit timezone.
 */
export function formatTime(
  value: string | number | Date | null | undefined,
  timeZone?: string | null,
  options?: { includeSeconds?: boolean },
  fallback = '—',
): string {
  const date = toValidDate(value)
  if (!date) return fallback
  const tz = resolveTimeZone(timeZone)
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    ...(options?.includeSeconds ? { second: '2-digit' } : {}),
    hour12: false,
    timeZone: tz,
  }).format(date)
}

/**
 * Deterministic number formatting across Node SSR and browsers.
 */
export function formatNumber(value: number | string | null | undefined): string {
  const num = Number(value || 0)
  return new Intl.NumberFormat(DEFAULT_LOCALE).format(Number.isFinite(num) ? num : 0)
}

/**
 * Deterministic Naira formatting across Node SSR and browsers.
 */
export function formatNaira(
  value: number | string | null | undefined,
  options?: { freeLabel?: string },
): string {
  const num = Number(value || 0)
  const safe = Number.isFinite(num) ? num : 0
  if (safe === 0 && options?.freeLabel) return options.freeLabel
  return `₦${formatNumber(safe)}`
}

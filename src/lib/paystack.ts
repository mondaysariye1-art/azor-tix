import 'server-only'

export type NigerianBank = {
  name: string
  code: string
}

const STANDARD_NIGERIAN_BANKS: NigerianBank[] = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank Nigeria', code: '023' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank (FCMB)', code: '214' },
  { name: 'Globus Bank', code: '103' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Jaiz Bank', code: '301' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Moniepoint MFB', code: '50515' },
  { name: 'OPay Digital Services Limited', code: '999992' },
  { name: 'PalmPay', code: '999991' },
  { name: 'Parallex Bank', code: '104' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'PremiumTrust Bank', code: '105' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered Bank', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'SunTrust Bank', code: '100' },
  { name: 'TAJBank', code: '302' },
  { name: 'Titan Trust Bank', code: '102' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank For Africa (UBA)', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'VFD Microfinance Bank', code: '566' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
]

let cachedPaystackBanks: { fetchedAt: number; banks: NigerianBank[] } | null = null

/**
 * Reads and normalizes PAYSTACK_SECRET_KEY from server environment without ever logging its value.
 */
export function getPaystackSecretKey(): string {
  const raw = (process.env.PAYSTACK_SECRET_KEY || '').trim()
  if (!raw) return ''
  return raw.replace(/^['"]|['"]$/g, '').replace(/^Bearer\s+/i, '').trim()
}

export function getPaystackConfigStatus(): {
  configured: boolean
  mode: 'live' | 'test' | 'invalid' | 'missing'
  validFormat: boolean
} {
  const key = getPaystackSecretKey()
  if (!key) return { configured: false, mode: 'missing', validFormat: false }
  if (key.startsWith('sk_live_')) return { configured: true, mode: 'live', validFormat: true }
  if (key.startsWith('sk_test_')) return { configured: true, mode: 'test', validFormat: true }
  return { configured: true, mode: 'invalid', validFormat: false }
}

export function isPaystackConfigured(): boolean {
  const status = getPaystackConfigStatus()
  return status.configured && status.validFormat
}

/**
 * Resolves a clean, single absolute origin URL for Paystack callbacks behind reverse proxies.
 */
export function resolvePublicOrigin(request: Request): string {
  const forwardedHostRaw = request.headers.get('x-forwarded-host') || ''
  const forwardedHost = forwardedHostRaw.split(',')[0]?.trim() || ''
  const host = forwardedHost || (request.headers.get('host') || '').split(',')[0]?.trim() || ''
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || ''

  const candidates: string[] = []
  if (host) {
    const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(host)
    const proto = forwardedProto || (isLocal ? 'http' : 'https')
    candidates.push(`${proto}://${host}`)
  }
  if (process.env.TICKET_VERIFY_BASE_URL) candidates.push(process.env.TICKET_VERIFY_BASE_URL.trim())
  if (process.env.APP_URL) candidates.push(process.env.APP_URL.trim())
  if (process.env.FIGMA_PUBLIC_URL) candidates.push(process.env.FIGMA_PUBLIC_URL.trim())
  if (process.env.NEXT_PUBLIC_SITE_URL) candidates.push(process.env.NEXT_PUBLIC_SITE_URL.trim())

  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      const normalized = candidate.includes('://') ? candidate : `https://${candidate}`
      const parsed = new URL(normalized)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.origin
      }
    } catch {
      // Skip malformed origin candidate
    }
  }
  return 'http://localhost:3000'
}

export async function listNigerianBanks(): Promise<{
  banks: NigerianBank[]
  source: 'paystack' | 'directory'
  paystackConfigured: boolean
}> {
  const paystackConfigured = isPaystackConfigured()
  if (
    cachedPaystackBanks &&
    Date.now() - cachedPaystackBanks.fetchedAt < 60 * 60 * 1000
  ) {
    return {
      banks: cachedPaystackBanks.banks,
      source: 'paystack',
      paystackConfigured,
    }
  }

  try {
    const key = getPaystackSecretKey()
    const headers: Record<string, string> = {}
    if (key) {
      headers.Authorization = `Bearer ${key}`
    }
    const response = await fetch(
      'https://api.paystack.co/bank?country=nigeria&perPage=500',
      {
        headers,
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      },
    )
    const data = (await response.json().catch(() => null)) as {
      status?: boolean
      data?: Array<{ name?: string; code?: string; active?: boolean }>
    } | null
    if (response.ok && data?.status && Array.isArray(data.data) && data.data.length > 0) {
      const seen = new Set<string>()
      const banks: NigerianBank[] = []
      for (const item of data.data) {
        if (!item.name || !item.code || item.active === false) continue
        const code = String(item.code).trim()
        if (!code || seen.has(code)) continue
        seen.add(code)
        banks.push({ name: item.name.trim(), code })
      }
      banks.sort((a, b) => a.name.localeCompare(b.name))
      cachedPaystackBanks = { fetchedAt: Date.now(), banks }
      return { banks, source: 'paystack', paystackConfigured }
    }
  } catch {
    // Fall back to standard CBN directory list when upstream network fails
  }

  return {
    banks: STANDARD_NIGERIAN_BANKS,
    source: 'directory',
    paystackConfigured,
  }
}

export type BankResolutionResult =
  | {
      ok: true
      accountName: string
      accountNumber: string
      bankCode: string
      bankName?: string
    }
  | {
      ok: false
      status: number
      error: string
    }

export async function resolveBankAccount(
  accountNumber: string,
  bankCode: string,
): Promise<BankResolutionResult> {
  const normalizedAccount = accountNumber.replace(/\D+/g, '')
  const normalizedBankCode = bankCode.trim()

  if (!/^\d{10}$/.test(normalizedAccount)) {
    return {
      ok: false,
      status: 400,
      error: 'Enter a valid 10-digit Nigerian NUBAN account number.',
    }
  }
  if (!normalizedBankCode) {
    return {
      ok: false,
      status: 400,
      error: 'Select your Nigerian bank from the list before verifying.',
    }
  }

  const keyStatus = getPaystackConfigStatus()
  if (!keyStatus.configured) {
    return {
      ok: false,
      status: 503,
      error:
        'Bank account name verification is unavailable because PAYSTACK_SECRET_KEY is not configured on the server.',
    }
  }
  if (!keyStatus.validFormat) {
    return {
      ok: false,
      status: 503,
      error:
        'Bank account verification failed because the server PAYSTACK_SECRET_KEY format is invalid (must start with sk_test_ or sk_live_).',
    }
  }

  const key = getPaystackSecretKey()

  try {
    const url = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(
      normalizedAccount,
    )}&bank_code=${encodeURIComponent(normalizedBankCode)}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    })
    const result = (await response.json().catch(() => null)) as {
      status?: boolean
      message?: string
      data?: { account_name?: string; account_number?: string; bank_id?: number }
    } | null

    if (!response.ok || !result?.status || !result.data?.account_name) {
      const apiMsg = (result?.message || '').trim()
      if (response.status === 401) {
        return {
          ok: false,
          status: 502,
          error:
            'Bank verification could not authenticate with Paystack. Confirm that a valid PAYSTACK_SECRET_KEY is set on the server.',
        }
      }
      if (response.status === 429) {
        return {
          ok: false,
          status: 429,
          error:
            apiMsg ||
            'Bank verification rate limit reached (Paystack test keys have a daily resolution limit). Wait and try again or switch to a live key.',
        }
      }
      if (response.status === 422 || response.status === 400) {
        return {
          ok: false,
          status: 422,
          error:
            apiMsg ||
            'Could not resolve this account number with the selected bank. Double-check the bank name and 10-digit account number.',
        }
      }
      return {
        ok: false,
        status: response.status >= 400 && response.status < 500 ? response.status : 502,
        error:
          apiMsg ||
          'Unable to verify this bank account right now. Confirm the bank and 10-digit account number and try again.',
      }
    }

    const bankDir = await listNigerianBanks()
    const matchedBank = bankDir.banks.find((b) => b.code === normalizedBankCode)

    return {
      ok: true,
      accountName: result.data.account_name.trim(),
      accountNumber: result.data.account_number?.trim() || normalizedAccount,
      bankCode: normalizedBankCode,
      bankName: matchedBank?.name,
    }
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError'
    return {
      ok: false,
      status: isTimeout ? 504 : 502,
      error: isTimeout
        ? 'Bank verification timed out while contacting the bank resolution service. Please try again.'
        : error instanceof Error
          ? `Bank verification service error: ${error.message}`
          : 'Bank verification is unavailable right now. Please try again later.',
    }
  }
}

export type PaystackInitializeResult =
  | {
      ok: true
      authorizationUrl: string
      accessCode: string
      reference: string
    }
  | {
      ok: false
      status: number
      error: string
      providerMessage?: string
    }

export async function initializePaystackTransaction(params: {
  email: string
  amountNaira: number
  reference: string
  callbackUrl: string
  metadata?: Record<string, unknown>
}): Promise<PaystackInitializeResult> {
  const keyStatus = getPaystackConfigStatus()
  if (!keyStatus.configured) {
    return {
      ok: false,
      status: 503,
      error:
        'Paystack payments are not configured yet. Add PAYSTACK_SECRET_KEY to server environment variables to enable paid ticket checkout.',
    }
  }
  if (!keyStatus.validFormat) {
    return {
      ok: false,
      status: 503,
      error:
        'PAYSTACK_SECRET_KEY is misconfigured on the server (expected a Paystack secret key starting with sk_test_ or sk_live_).',
    }
  }

  const email = params.email.trim().toLowerCase()
  const amountKobo = Math.round(Number(params.amountNaira) * 100)
  const reference = params.reference.trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, status: 400, error: 'A valid customer email address is required for Paystack checkout.' }
  }
  if (!Number.isInteger(amountKobo) || amountKobo < 100) {
    return { ok: false, status: 400, error: 'Order payment amount must be at least ₦1 (100 kobo).' }
  }
  if (!reference || reference.length > 100) {
    return { ok: false, status: 400, error: 'Invalid payment reference generated for checkout.' }
  }

  let validatedCallbackUrl: string
  try {
    const parsedCallback = new URL(params.callbackUrl)
    if (parsedCallback.protocol !== 'http:' && parsedCallback.protocol !== 'https:') {
      throw new Error('Invalid callback protocol')
    }
    validatedCallbackUrl = parsedCallback.toString()
  } catch {
    return {
      ok: false,
      status: 500,
      error: 'Checkout callback URL is invalid. Configure TICKET_VERIFY_BASE_URL or APP_URL on the server.',
    }
  }

  const key = getPaystackSecretKey()

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        currency: 'NGN',
        reference,
        callback_url: validatedCallbackUrl,
        ...(params.metadata ? { metadata: params.metadata } : {}),
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })

    const result = (await response.json().catch(() => null)) as {
      status?: boolean
      message?: string
      data?: {
        authorization_url?: string
        access_code?: string
        reference?: string
      }
    } | null

    if (!response.ok || !result?.status || !result.data?.authorization_url) {
      const apiMsg = (result?.message || '').trim()
      console.error('[paystack] transaction/initialize failed:', {
        httpStatus: response.status,
        providerMessage: apiMsg || 'No message returned',
        reference,
        amountKobo,
      })

      if (response.status === 401) {
        return {
          ok: false,
          status: 502,
          providerMessage: apiMsg,
          error:
            'Paystack rejected the server secret key (HTTP 401). Verify PAYSTACK_SECRET_KEY in your environment settings.',
        }
      }

      return {
        ok: false,
        status: response.status >= 400 && response.status < 500 ? response.status : 502,
        providerMessage: apiMsg,
        error: apiMsg
          ? `Paystack initialization failed: ${apiMsg}`
          : `Paystack initialization failed (HTTP ${response.status}). Please try again.`,
      }
    }

    return {
      ok: true,
      authorizationUrl: result.data.authorization_url,
      accessCode: String(result.data.access_code || ''),
      reference: String(result.data.reference || reference),
    }
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError'
    console.error('[paystack] transaction/initialize exception:', {
      reference,
      message: error instanceof Error ? error.message : 'Unknown error',
    })
    return {
      ok: false,
      status: isTimeout ? 504 : 502,
      error: isTimeout
        ? 'Connection to Paystack timed out. Please try again.'
        : 'Unable to connect to Paystack right now. Please check your connection and try again.',
    }
  }
}

export async function verifyPaystackTransaction(reference: string): Promise<
  | { ok: true; data: Record<string, any> }
  | { ok: false; status: number; error: string }
> {
  const key = getPaystackSecretKey()
  if (!key) {
    return { ok: false, status: 503, error: 'PAYSTACK_SECRET_KEY is not configured.' }
  }
  const cleanRef = reference.trim()
  if (!cleanRef) {
    return { ok: false, status: 400, error: 'Missing Paystack transaction reference.' }
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanRef)}`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      },
    )
    const result = (await response.json().catch(() => null)) as {
      status?: boolean
      message?: string
      data?: Record<string, any>
    } | null

    if (!response.ok || !result?.status || !result.data) {
      return {
        ok: false,
        status: response.status || 502,
        error: result?.message || 'Paystack transaction verification failed.',
      }
    }

    if (String(result.data.status || '').toLowerCase() !== 'success') {
      return {
        ok: false,
        status: 402,
        error: `Payment has not succeeded (status: ${result.data.status || 'unknown'}).`,
      }
    }

    return { ok: true, data: result.data }
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: error instanceof Error ? error.message : 'Unable to verify transaction with Paystack.',
    }
  }
}

export async function createPaystackTransferRecipient(params: {
  name: string
  accountNumber: string
  bankCode: string
  currency?: string
}): Promise<
  | { ok: true; recipientCode: string; raw: Record<string, any> }
  | { ok: false; status: number; error: string; raw?: Record<string, any> | null }
> {
  const key = getPaystackSecretKey()
  if (!key) {
    return {
      ok: false,
      status: 503,
      error:
        'Paystack transfers are unavailable because PAYSTACK_SECRET_KEY is not configured on the server.',
    }
  }

  try {
    const response = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: params.name,
        account_number: params.accountNumber,
        bank_code: params.bankCode,
        currency: params.currency || 'NGN',
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    })
    const result = (await response.json().catch(() => null)) as {
      status?: boolean
      message?: string
      data?: { recipient_code?: string }
    } | null

    if (!response.ok || !result?.status || !result.data?.recipient_code) {
      return {
        ok: false,
        status: response.status >= 400 && response.status < 500 ? response.status : 502,
        error: result?.message || 'Paystack could not create transfer recipient.',
        raw: result as any,
      }
    }

    return {
      ok: true,
      recipientCode: result.data.recipient_code,
      raw: result as any,
    }
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error:
        error instanceof Error
          ? `Paystack transfer recipient error: ${error.message}`
          : 'Paystack transfer recipient service failed.',
    }
  }
}

export async function initiatePaystackTransfer(params: {
  amountKobo: number
  recipientCode: string
  reference: string
  reason: string
}): Promise<
  | {
      ok: true
      transferCode: string
      reference: string
      transferStatus: string
      raw: Record<string, any>
    }
  | { ok: false; status: number; error: string; raw?: Record<string, any> | null }
> {
  const key = getPaystackSecretKey()
  if (!key) {
    return {
      ok: false,
      status: 503,
      error:
        'Paystack transfers are unavailable because PAYSTACK_SECRET_KEY is not configured on the server.',
    }
  }

  try {
    const response = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(params.amountKobo),
        recipient: params.recipientCode,
        reference: params.reference,
        reason: params.reason,
        currency: 'NGN',
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    const result = (await response.json().catch(() => null)) as {
      status?: boolean
      message?: string
      data?: {
        transfer_code?: string
        reference?: string
        status?: string
      }
    } | null

    if (!response.ok || !result?.status || !result.data?.transfer_code) {
      return {
        ok: false,
        status: response.status >= 400 && response.status < 500 ? response.status : 502,
        error: result?.message || 'Paystack transfer request was rejected.',
        raw: result as any,
      }
    }

    return {
      ok: true,
      transferCode: result.data.transfer_code,
      reference: result.data.reference || params.reference,
      transferStatus: String(result.data.status || 'pending').toLowerCase(),
      raw: result as any,
    }
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error:
        error instanceof Error
          ? `Paystack transfer error: ${error.message}`
          : 'Paystack transfer service failed.',
    }
  }
}

export async function refundPaystackTransaction(params: {
  reference: string
  amountKobo?: number
  merchantNote?: string
}): Promise<
  | { ok: true; refundId: string; refundStatus: string; raw: Record<string, any> }
  | { ok: false; status: number; error: string; raw?: Record<string, any> | null }
> {
  const key = getPaystackSecretKey()
  if (!key) {
    return {
      ok: false,
      status: 503,
      error:
        'Paystack refunds cannot be processed because PAYSTACK_SECRET_KEY is not configured on the server.',
    }
  }

  try {
    const response = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: params.reference,
        ...(params.amountKobo ? { amount: Math.round(params.amountKobo) } : {}),
        ...(params.merchantNote ? { merchant_note: params.merchantNote } : {}),
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    const result = (await response.json().catch(() => null)) as {
      status?: boolean
      message?: string
      data?: { id?: number | string; status?: string }
    } | null

    if (!response.ok || !result?.status) {
      return {
        ok: false,
        status: response.status >= 400 && response.status < 500 ? response.status : 502,
        error: result?.message || 'Paystack refund request failed.',
        raw: result as any,
      }
    }

    return {
      ok: true,
      refundId: String(result.data?.id || ''),
      refundStatus: String(result.data?.status || 'pending').toLowerCase(),
      raw: result as any,
    }
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error:
        error instanceof Error
          ? `Paystack refund error: ${error.message}`
          : 'Paystack refund service failed.',
    }
  }
}

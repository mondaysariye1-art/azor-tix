'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import jsQR from 'jsqr'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Camera,
  CameraOff,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  Keyboard,
  Loader2,
  Lock,
  MapPin,
  QrCode,
  RefreshCw,
  ScanLine,
  SwitchCamera,
  Unlock,
  Users,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { formatDateTime, formatReadableDateTime, formatTime } from '@/lib/format'

export interface ScannerEventOption {
  id: string
  title: string
  startsAt?: string | null
  timezone?: string | null
  venue?: string
  address?: string
  checkInStatus?: 'open' | 'closed'
  canManageCheckInStatus?: boolean
}

interface CheckInTicketInfo {
  id: string
  code: string
  attendeeName: string
  attendeeEmail?: string | null
  purchaserName?: string | null
  ticketTypeName: string
  acquisitionType?: string
  peopleCovered?: number
  eventId: string
  eventName: string
  orderReference: string
  source: string
  status: string
  checkedInAt?: string | null
  checkedInByName?: string | null
}

interface EventStats {
  eventId: string
  eventTitle: string
  eventDate: string
  eventTime: string
  eventVenue: string
  checkInStatus: 'open' | 'closed'
  totalIssued: number
  paidTickets: number
  giftTickets: number
  privateInvitationTickets: number
  publicFreeTickets: number
  complimentaryTickets: number
  expectedAttendees: number
  checkedInTickets: number
  checkedInAttendees: number
  remainingTickets: number
  cancelledTickets: number
  refundedTickets: number
  checkInPercentage: number
  recentCheckIns: Array<{
    id: string
    code: string
    attendeeName: string
    ticketTypeName: string
    acquisitionType: string
    checkedInAt: string
    checkedInByName?: string | null
  }>
}

type ScanStatusCode =
  | 'VALID_TICKET'
  | 'ALREADY_USED'
  | 'INVALID_TICKET'
  | 'CANCELLED_TICKET'
  | 'REFUNDED_TICKET'
  | 'WRONG_EVENT'
  | 'EVENT_NOT_OPEN'
  | 'NETWORK_ERROR'

interface ScanResult {
  ok: boolean
  code: ScanStatusCode
  headline: string
  message: string
  ticket?: CheckInTicketInfo | null
  scannedAt: string
  rawInput: string
}

function getTone(code: ScanStatusCode): 'valid' | 'warn' | 'error' {
  if (code === 'VALID_TICKET') return 'valid'
  if (code === 'ALREADY_USED' || code === 'EVENT_NOT_OPEN') return 'warn'
  return 'error'
}

function formatAcquisitionBadge(type?: string): string {
  switch (type) {
    case 'gift':
      return 'Gift Ticket'
    case 'private-invitation':
      return 'Private Invitation'
    case 'public-free':
      return 'Public Free'
    case 'complimentary':
      return 'Complimentary'
    default:
      return 'Paid Ticket'
  }
}

export function CheckInScanner({
  events,
  dashboardUrl,
}: {
  events: ScannerEventOption[]
  dashboardUrl?: string
}) {
  const router = useRouter()
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id ? String(events[0].id) : '')
  const [manualInput, setManualInput] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [stats, setStats] = useState<EventStats | null>(null)
  const [togglingDoor, setTogglingDoor] = useState(false)
  const [doorNotice, setDoorNotice] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [history, setHistory] = useState<ScanResult[]>([])

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const busyRef = useRef(false)
  const lastScannedRef = useRef<{ value: string; timestamp: number }>({ value: '', timestamp: 0 })

  const activeEvent = useMemo(
    () => events.find((ev) => String(ev.id) === String(selectedEventId)) || null,
    [events, selectedEventId],
  )

  const loadStats = useCallback(async (eventId: string) => {
    if (!eventId) {
      setStats(null)
      return
    }
    setStatsLoading(true)
    try {
      const response = await fetch(
        `/api/dashboard/check-in?eventId=${encodeURIComponent(eventId)}`,
        { cache: 'no-store' },
      )
      if (response.ok) {
        const data = await response.json()
        if (data?.stats) {
          setStats(data.stats)
        }
      }
    } catch {
      // Keep previous stats on transient network failure
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      void loadStats(selectedEventId)
    } else {
      setStats(null)
    }
  }, [selectedEventId, loadStats])

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
    setTorchSupported(false)
    setTorchOn(false)
  }, [])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  const submitCredential = useCallback(
    async (rawValue: string) => {
      const cleaned = rawValue.trim()
      if (!cleaned || busyRef.current) return

      busyRef.current = true
      setBusy(true)
      try {
        const response = await fetch('/api/dashboard/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: cleaned,
            eventId: selectedEventId || undefined,
          }),
        })
        const data = await response.json().catch(() => null)
        const nextResult: ScanResult = {
          ok: Boolean(data?.ok),
          code: (data?.code as ScanStatusCode) || 'INVALID_TICKET',
          headline:
            data?.headline || (data?.ok ? 'VALID TICKET — ENTRY APPROVED' : 'INVALID TICKET'),
          message:
            data?.message ||
            data?.error ||
            'INVALID TICKET — Ticket not found or verification failed.',
          ticket: data?.ticket || null,
          scannedAt: formatTime(new Date(), activeEvent?.timezone, { includeSeconds: true }),
          rawInput: cleaned,
        }
        setLastResult(nextResult)
        setHistory((prev) => [nextResult, ...prev].slice(0, 15))
        if (data?.stats) {
          setStats(data.stats)
        } else if (nextResult.ok && selectedEventId) {
          void loadStats(selectedEventId)
        }
        if (nextResult.ok) {
          router.refresh()
        }
      } catch {
        const failed: ScanResult = {
          ok: false,
          code: 'NETWORK_ERROR',
          headline: 'NETWORK ERROR — RETRY REQUIRED',
          message:
            'Could not reach the AZORTIX check-in server. Confirm your internet connection and scan or submit again.',
          ticket: null,
          scannedAt: formatTime(new Date(), activeEvent?.timezone, { includeSeconds: true }),
          rawInput: cleaned,
        }
        setLastResult(failed)
      } finally {
        busyRef.current = false
        setBusy(false)
      }
    },
    [selectedEventId, activeEvent?.timezone, loadStats, router],
  )

  const handleDecodedQr = useCallback(
    (decodedText: string) => {
      const value = decodedText.trim()
      if (!value || busyRef.current) return
      const now = Date.now()
      if (
        lastScannedRef.current.value === value &&
        now - lastScannedRef.current.timestamp < 2800
      ) {
        return
      }
      lastScannedRef.current = { value, timestamp: now }
      void submitCredential(value)
    },
    [submitCredential],
  )

  const startCamera = useCallback(
    async (requestedFacing?: 'environment' | 'user') => {
      const targetFacing = requestedFacing || facingMode
      stopCamera()
      setCameraError('')
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        setCameraError(
          'Camera access is unavailable on this browser. Use manual ticket code entry below.',
        )
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        streamRef.current = stream
        setCameraActive(true)
        setFacingMode(targetFacing)

        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
          try {
            const caps = videoTrack.getCapabilities() as any
            setTorchSupported(Boolean(caps?.torch))
          } catch {
            setTorchSupported(false)
          }
        }

        requestAnimationFrame(async () => {
          const video = videoRef.current
          if (!video) return
          video.srcObject = stream
          try {
            await video.play()
          } catch {
            // Autoplay handled by muted + playsInline
          }

          const BarcodeDetectorCtor = (window as any).BarcodeDetector
          const detector =
            typeof BarcodeDetectorCtor === 'function'
              ? new BarcodeDetectorCtor({ formats: ['qr_code'] })
              : null

          let lastTick = 0
          const scanFrame = async (ts: number) => {
            if (!streamRef.current) return
            if (ts - lastTick >= 200 && video.readyState >= 2 && video.videoWidth > 0) {
              lastTick = ts
              let detectedValue = ''

              if (detector) {
                try {
                  const barcodes = await detector.detect(video)
                  if (Array.isArray(barcodes) && barcodes[0]?.rawValue) {
                    detectedValue = String(barcodes[0].rawValue)
                  }
                } catch {
                  // Fall back to jsQR
                }
              }

              if (!detectedValue && canvasRef.current) {
                const canvas = canvasRef.current
                const ctx = canvas.getContext('2d', { willReadFrequently: true })
                if (ctx) {
                  const targetWidth = Math.min(video.videoWidth, 640)
                  const scale = targetWidth / video.videoWidth
                  const targetHeight = Math.round(video.videoHeight * scale)
                  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                    canvas.width = targetWidth
                    canvas.height = targetHeight
                  }
                  ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
                  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight)
                  const code = jsQR(imgData.data, imgData.width, imgData.height, {
                    inversionAttempts: 'dontInvert',
                  })
                  if (code?.data) {
                    detectedValue = code.data
                  }
                }
              }

              if (detectedValue) {
                handleDecodedQr(detectedValue)
              }
            }
            rafRef.current = requestAnimationFrame(scanFrame)
          }

          rafRef.current = requestAnimationFrame(scanFrame)
        })
      } catch {
        stopCamera()
        setCameraError(
          'Camera permission was denied or no camera was detected. You can still validate tickets using manual code entry below.',
        )
      }
    },
    [facingMode, handleDecodedQr, stopCamera],
  )

  const handleSwitchCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextFacing)
    if (cameraActive) {
      void startCamera(nextFacing)
    }
  }

  const handleToggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track || !torchSupported) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as any] })
      setTorchOn(next)
    } catch {
      setTorchSupported(false)
      setTorchOn(false)
    }
  }

  const handleToggleCheckInOpen = async () => {
    if (!activeEvent || !activeEvent.canManageCheckInStatus || togglingDoor) return
    const currentStatus = stats?.checkInStatus || activeEvent.checkInStatus || 'closed'
    const nextStatus = currentStatus === 'open' ? 'closed' : 'open'
    setTogglingDoor(true)
    setDoorNotice('')
    try {
      const form = new FormData()
      form.set('eventId', activeEvent.id)
      form.set('checkInStatus', nextStatus)
      const res = await fetch('/api/dashboard/event-settings', { method: 'POST', body: form })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDoorNotice(result.error || 'Could not update check-in status.')
      } else {
        setDoorNotice(
          nextStatus === 'open'
            ? 'Check-in is now OPEN for door scanning.'
            : 'Check-in is now CLOSED. Scans will be paused until reopened.',
        )
        await loadStats(activeEvent.id)
        router.refresh()
      }
    } catch {
      setDoorNotice('Network error updating check-in status.')
    } finally {
      setTogglingDoor(false)
    }
  }

  const handleManualSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!manualInput.trim()) return
    await submitCredential(manualInput)
    setManualInput('')
  }

  const currentDoorStatus = stats?.checkInStatus || activeEvent?.checkInStatus || 'closed'

  return (
    <div className="checkin-console">
      {/* Branded Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-neutral-200">
        <div className="flex items-center gap-4">
          <Image
            src="/assets/azor-tix-wordmark-black.png"
            alt="AZORTIX"
            width={132}
            height={44}
            className="h-8 w-auto object-contain"
          />
          <div className="h-6 w-px bg-neutral-300 hidden sm:block" aria-hidden="true" />
          <div>
            <span className="eyebrow">AZORTIX Door Check-In</span>
            <p className="text-xs text-neutral-500 m-0">
              One-time atomic QR verification &amp; live attendance
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedEventId && (
            <button
              type="button"
              onClick={() => void loadStats(selectedEventId)}
              disabled={statsLoading}
              className="button button-cream"
            >
              <RefreshCw size={14} className={statsLoading ? 'spin' : ''} />
              <span>Refresh Stats</span>
            </button>
          )}
          {dashboardUrl && (
            <Link href={dashboardUrl} className="button button-dark">
              <ArrowLeft size={14} />
              <span>Back to Dashboard</span>
            </Link>
          )}
        </div>
      </div>

      {/* Event Selector + Event Details + Open/Close Door Control */}
      <div className="checkin-console-header">
        <div>
          <h2 className="m-0">{stats?.eventTitle || activeEvent?.title || 'Select an event'}</h2>
          {(stats || activeEvent) && (
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-neutral-600">
              {(stats?.eventDate || activeEvent?.startsAt) && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={14} />
                  {stats
                    ? `${stats.eventDate} · ${stats.eventTime}`
                    : activeEvent?.startsAt
                      ? formatDateTime(activeEvent.startsAt, activeEvent.timezone)
                      : ''}
                </span>
              )}
              {(stats?.eventVenue || activeEvent?.venue) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} />
                  {stats?.eventVenue || activeEvent?.venue}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                  currentDoorStatus === 'open'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {currentDoorStatus === 'open' ? <Unlock size={12} /> : <Lock size={12} />}
                Check-In {currentDoorStatus === 'open' ? 'Open' : 'Closed'}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="checkin-event-filter">
            <span>Active Event</span>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value)
                setDoorNotice('')
              }}
              aria-label="Select event for check-in"
            >
              {events.length === 0 ? (
                <option value="">No authorized events</option>
              ) : (
                <>
                  {events.map((ev) => (
                    <option key={ev.id} value={String(ev.id)}>
                      {ev.title}
                    </option>
                  ))}
                  <option value="">All authorized events (no event lock)</option>
                </>
              )}
            </select>
          </label>
          {activeEvent?.canManageCheckInStatus && (
            <button
              type="button"
              disabled={togglingDoor}
              onClick={handleToggleCheckInOpen}
              className={`button ${currentDoorStatus === 'open' ? 'button-cream' : 'button-coral'}`}
            >
              {currentDoorStatus === 'open' ? <Lock size={14} /> : <Unlock size={14} />}
              <span>
                {togglingDoor
                  ? 'Updating…'
                  : currentDoorStatus === 'open'
                    ? 'Close Check-In'
                    : 'Open Check-In'}
              </span>
            </button>
          )}
        </div>
      </div>

      {doorNotice && <p className="form-success mb-4">{doorNotice}</p>}

      {selectedEventId && currentDoorStatus !== 'open' && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-5 flex items-center gap-2.5">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            <strong>Check-in is currently closed for this event.</strong> Scans will return{' '}
            <em>EVENT NOT OPEN FOR CHECK-IN</em> until an organizer or admin opens check-in.
          </span>
        </div>
      )}

      {/* Live Attendance Statistics */}
      {stats && (
        <section className="mb-6" aria-label="Event Attendance Statistics">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-3">
            <div className="rounded-lg border border-neutral-200 bg-white p-3">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 block">
                Checked In
              </span>
              <strong className="text-xl font-bold text-neutral-900">
                {stats.checkedInTickets} / {stats.totalIssued}
              </strong>
              <span className="text-xs text-emerald-700 font-medium block">
                {stats.checkInPercentage}% arrived
              </span>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-3">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 block">
                Remaining
              </span>
              <strong className="text-xl font-bold text-neutral-900">
                {stats.remainingTickets}
              </strong>
              <span className="text-xs text-neutral-500 block">not checked in</span>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-3">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 block">
                Expected Guests
              </span>
              <strong className="text-xl font-bold text-neutral-900 flex items-center gap-1">
                <Users size={15} /> {stats.expectedAttendees}
              </strong>
              <span className="text-xs text-neutral-500 block">
                {stats.checkedInAttendees} inside
              </span>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-3">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 block">
                Paid / Gift
              </span>
              <strong className="text-xl font-bold text-neutral-900">
                {stats.paidTickets} / {stats.giftTickets}
              </strong>
              <span className="text-xs text-neutral-500 block">self · gifted</span>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-3">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 block">
                Private / Free
              </span>
              <strong className="text-xl font-bold text-neutral-900">
                {stats.privateInvitationTickets + stats.complimentaryTickets} /{' '}
                {stats.publicFreeTickets}
              </strong>
              <span className="text-xs text-neutral-500 block">invites · public free</span>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-3">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 block">
                Cancelled / Refunded
              </span>
              <strong className="text-xl font-bold text-neutral-900">
                {stats.cancelledTickets} / {stats.refundedTickets}
              </strong>
              <span className="text-xs text-neutral-500 block">blocked at door</span>
            </div>
          </div>
        </section>
      )}

      <div className="checkin-grid">
        {/* Left: Live Camera QR Scanner + Manual Code Input */}
        <div className="checkin-inputs">
          <div className="checkin-camera-box">
            <div className="checkin-camera-bar">
              <span className="checkin-camera-label">
                <QrCode size={15} aria-hidden="true" />
                <span>Camera QR Scanner</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {cameraActive && (
                  <button
                    type="button"
                    className="checkin-cam-toggle"
                    onClick={handleSwitchCamera}
                    title="Switch between rear and front camera"
                  >
                    <SwitchCamera size={14} aria-hidden="true" />
                    <span>{facingMode === 'environment' ? 'Front Cam' : 'Rear Cam'}</span>
                  </button>
                )}
                {cameraActive && torchSupported && (
                  <button
                    type="button"
                    className={`checkin-cam-toggle ${torchOn ? 'active' : ''}`}
                    onClick={handleToggleTorch}
                    title="Toggle camera flashlight"
                  >
                    {torchOn ? <FlashlightOff size={14} /> : <Flashlight size={14} />}
                    <span>{torchOn ? 'Light Off' : 'Light'}</span>
                  </button>
                )}
                {cameraActive ? (
                  <button
                    type="button"
                    className="checkin-cam-toggle active"
                    onClick={stopCamera}
                  >
                    <CameraOff size={14} aria-hidden="true" />
                    <span>Stop Camera</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="checkin-cam-toggle"
                    onClick={() => void startCamera(facingMode)}
                  >
                    <Camera size={14} aria-hidden="true" />
                    <span>Start Camera</span>
                  </button>
                )}
              </div>
            </div>

            {cameraActive ? (
              <div className="checkin-viewfinder">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="checkin-video"
                />
                <div className="checkin-reticle" aria-hidden="true">
                  <ScanLine size={24} />
                </div>
                <canvas ref={canvasRef} className="checkin-hidden-canvas" />
              </div>
            ) : (
              <div className="checkin-camera-idle">
                <Camera size={28} aria-hidden="true" />
                <p>Tap &ldquo;Start Camera&rdquo; to continuously scan AZORTIX QR passes.</p>
              </div>
            )}

            {cameraError && (
              <p className="checkin-camera-error" role="alert">
                {cameraError}
              </p>
            )}
          </div>

          <form className="checkin-manual-form" onSubmit={handleManualSubmit}>
            <label htmlFor="manual-ticket-input">
              <Keyboard size={14} aria-hidden="true" />
              <span>Manual Ticket Code or Verification URL</span>
            </label>
            <div className="checkin-manual-row">
              <input
                id="manual-ticket-input"
                name="code"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="e.g. AZT-4K8P-9M2X or paste verification URL"
                autoComplete="off"
                required
              />
              <button
                type="submit"
                disabled={busy || !manualInput.trim()}
                className="button button-dark"
              >
                {busy ? <Loader2 size={15} className="spin" /> : null}
                <span>{busy ? 'Checking…' : 'Validate & Check In'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Live Verification Result + Recent Check-Ins */}
        <div className="checkin-output">
          {lastResult ? (
            <div className="checkin-result-card" role="status" aria-live="polite">
              <div className={`checkin-result-banner tone-${getTone(lastResult.code)}`}>
                <div className="checkin-result-icon" aria-hidden="true">
                  {lastResult.code === 'VALID_TICKET' ? (
                    <CheckCircle2 size={24} />
                  ) : lastResult.code === 'NETWORK_ERROR' ? (
                    <WifiOff size={24} />
                  ) : lastResult.code === 'ALREADY_USED' || lastResult.code === 'EVENT_NOT_OPEN' ? (
                    <AlertTriangle size={24} />
                  ) : (
                    <XCircle size={24} />
                  )}
                </div>
                <div>
                  <p className="checkin-result-headline">{lastResult.headline}</p>
                  <p className="checkin-result-message">{lastResult.message}</p>
                </div>
              </div>

              {lastResult.ticket && (
                <dl className="checkin-ticket-facts">
                  <div>
                    <dt>Ticket Holder</dt>
                    <dd>{lastResult.ticket.attendeeName}</dd>
                  </div>
                  <div>
                    <dt>Category</dt>
                    <dd>
                      {lastResult.ticket.ticketTypeName} ·{' '}
                      {formatAcquisitionBadge(lastResult.ticket.acquisitionType)}
                    </dd>
                  </div>
                  <div>
                    <dt>Event</dt>
                    <dd>{lastResult.ticket.eventName}</dd>
                  </div>
                  <div>
                    <dt>Ticket Code</dt>
                    <dd>
                      <code>{lastResult.ticket.code}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{lastResult.ticket.status.toUpperCase()}</dd>
                  </div>
                  {lastResult.ticket.checkedInAt && (
                    <div>
                      <dt>Checked In At</dt>
                      <dd>
                        {formatReadableDateTime(lastResult.ticket.checkedInAt, activeEvent?.timezone)}
                        {lastResult.ticket.checkedInByName
                          ? ` · by ${lastResult.ticket.checkedInByName}`
                          : ''}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          ) : (
            <div className="checkin-empty-result">
              <QrCode size={24} aria-hidden="true" />
              <h3>Ready to scan</h3>
              <p>
                Scan an attendee&apos;s AZORTIX QR ticket or enter their code manually for instant
                one-time server verification.
              </p>
            </div>
          )}

          {history.length > 0 && (
            <div className="checkin-history">
              <h4>Session Scan Log ({history.length})</h4>
              <ul>
                {history.map((item, idx) => (
                  <li
                    key={`${item.rawInput}-${item.scannedAt}-${idx}`}
                    className={`tone-${getTone(item.code)}`}
                  >
                    <div>
                      <strong>{item.headline}</strong>
                      <span>
                        {item.ticket
                          ? `${item.ticket.attendeeName} · ${item.ticket.code}`
                          : item.rawInput.slice(0, 32)}
                      </span>
                    </div>
                    <time>{item.scannedAt}</time>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stats && stats.recentCheckIns.length > 0 && (
            <div className="checkin-history mt-4">
              <h4>Recent Event Check-Ins ({stats.recentCheckIns.length})</h4>
              <ul>
                {stats.recentCheckIns.slice(0, 8).map((entry) => (
                  <li key={entry.id} className="tone-valid">
                    <div>
                      <strong>{entry.attendeeName}</strong>
                      <span>
                        {entry.ticketTypeName} · {entry.code} ·{' '}
                        {formatAcquisitionBadge(entry.acquisitionType)}
                      </span>
                    </div>
                    <time>
                      {formatTime(entry.checkedInAt, activeEvent?.timezone)}
                    </time>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

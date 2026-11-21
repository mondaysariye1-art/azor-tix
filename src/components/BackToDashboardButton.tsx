'use client'

import { useEffect, useState } from 'react'

export function BackToDashboardButton({
  dashboardUrl: initialDashboardUrl,
  className = 'button button-cream',
  label = 'Back to Dashboard',
  hideWhenLoggedOut = true,
}: {
  dashboardUrl?: string | null
  className?: string
  label?: string
  hideWhenLoggedOut?: boolean
}) {
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(initialDashboardUrl ?? null)

  useEffect(() => {
    if (initialDashboardUrl !== undefined) {
      setDashboardUrl(initialDashboardUrl)
      return
    }
    let active = true
    fetch('/api/app-auth/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return
        if (data?.authenticated && typeof data?.dashboardUrl === 'string' && data.dashboardUrl.startsWith('/dashboard/')) {
          setDashboardUrl(data.dashboardUrl)
        } else {
          setDashboardUrl(null)
        }
      })
      .catch(() => {
        if (active) setDashboardUrl(null)
      })
    return () => {
      active = false
    }
  }, [initialDashboardUrl])

  if (!dashboardUrl) {
    if (hideWhenLoggedOut) return null
    return null
  }

  return (
    <a href={dashboardUrl} className={className}>
      {label}
    </a>
  )
}

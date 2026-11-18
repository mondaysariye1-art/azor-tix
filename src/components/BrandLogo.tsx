import Image from 'next/image'
import Link from 'next/link'

export function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand-logo ${light ? 'brand-logo-light' : ''}`}
      aria-label="AZOR TIX home"
    >
      <Image
        src="/azor-tix-logo.png"
        alt="AZOR TIX — Ticketing made easy"
        width={653}
        height={225}
        priority
      />
    </Link>
  )
}

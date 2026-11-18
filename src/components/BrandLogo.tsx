import Image from 'next/image'
import Link from 'next/link'

export function BrandLogo({
  light = false,
  variant = 'default',
}: {
  light?: boolean
  variant?: 'default' | 'homepage-white'
}) {
  if (variant === 'homepage-white') {
    return (
      <Link
        href="/"
        className="brand-logo brand-logo-white"
        aria-label="AZOR TIX home"
      >
        <Image
          src="/assets/azor-tix-wordmark-white.png"
          alt="AZOR TIX — Ticketing made easy"
          width={642}
          height={214}
          priority
        />
      </Link>
    )
  }

  return (
    <Link
      href="/"
      className={`brand-logo ${light ? 'brand-logo-light' : ''}`}
      aria-label="AZOR TIX home"
    >
      <Image
        src="/assets/aistudio/image_2d960078.png"
        alt="AZOR TIX — Ticketing made easy"
        width={1080}
        height={1080}
        priority
      />
    </Link>
  )
}

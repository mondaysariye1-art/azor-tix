import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'
import { BackToDashboardButton } from '@/components/BackToDashboardButton'
import { getPublicNavigationUser } from '@/lib/app-auth'
import { formatDate } from '@/lib/format'
import {
  getOrganizerProfile,
  getOrganizerPublishedEvents,
} from '@/lib/organizer-profiles'

export const dynamic = 'force-dynamic'

export default async function OrganizerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [profile, navUser] = await Promise.all([
    getOrganizerProfile(slug),
    getPublicNavigationUser(),
  ])
  if (!profile) notFound()
  const owner = typeof profile.owner === 'object' ? profile.owner.id : profile.owner
  const events = await getOrganizerPublishedEvents(String(owner))
  const logo = typeof profile.logo === 'object' ? profile.logo : null
  const dashboardUrl = navUser?.dashboardUrl ?? null

  return (
    <main className="public-organizer">
      <header className="public-organizer-nav">
        <BrandLogo />
        <div className="public-nav-actions">
          <BackToDashboardButton dashboardUrl={dashboardUrl} className="button button-cream" />
          <Link className="button button-dark" href="/discover">
            Discover events
          </Link>
        </div>
      </header>
      <section className="public-organizer-hero">
        {logo?.url ? (
          <Image src={logo.url} alt={`${profile.displayName} logo`} width={180} height={180} />
        ) : (
          <div className="organizer-monogram">{profile.displayName.slice(0, 1)}</div>
        )}
        <span className="eyebrow">AZORTIX organizer</span>
        <h1>{profile.displayName}</h1>
        {profile.about && <p>{profile.about}</p>}
        <div className="organizer-socials">
          {profile.social?.website && <a href={profile.social.website}>Website</a>}
          {profile.social?.instagram && <a href={profile.social.instagram}>Instagram</a>}
          {profile.social?.facebook && <a href={profile.social.facebook}>Facebook</a>}
          {profile.social?.tiktok && <a href={profile.social.tiktok}>TikTok</a>}
        </div>
      </section>
      <section className="public-organizer-events">
        <span className="eyebrow">Published events</span>
        <h2>What’s coming up</h2>
        <div className="organizer-event-grid">
          {events.map((event) => {
            const image = typeof event.heroImage === 'object' ? event.heroImage : null
            return (
              <Link href={`/events/${event.slug}`} key={event.id}>
                {image?.url && (
                  <Image src={image.url} alt={`${event.title} artwork`} width={720} height={460} />
                )}
                <div>
                  <span>{event.category}</span>
                  <h3>{event.title}</h3>
                  <p>
                    {event.startsAt
                      ? formatDate(event.startsAt, (event as any).timezone)
                      : 'Date to be announced'}
                  </p>
                </div>
              </Link>
            )
          })}
          {!events.length && <p className="empty-copy">No published events yet.</p>}
        </div>
      </section>
    </main>
  )
}

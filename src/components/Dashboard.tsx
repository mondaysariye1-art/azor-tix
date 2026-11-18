'use client'

import { FormEvent, useState } from 'react'

import { BrandLogo } from './BrandLogo'

const money = (value: number) => `₦${Number(value || 0).toLocaleString()}`

export default function Dashboard({ data, user }: { data: any; user: any }) {
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>, endpoint: string) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const form = event.currentTarget
    const response = await fetch(endpoint, { method: 'POST', body: new FormData(form) })
    const result = await response.json()
    setBusy(false)
    if (!response.ok) return setError(result.error || 'The request could not be completed.')
    setNotice(result.message || 'Saved.')
    form.reset()
    window.location.reload()
  }

  async function logout() {
    await fetch('/api/app-auth/logout', { method: 'POST' })
    window.location.assign('/')
  }

  const organizer = user.role === 'organizer'
  const superAdmin = user.role === 'super-admin'

  return (
    <div className="dashboard">
      <aside className="dashboard-nav">
        <BrandLogo light />
        <div>
          <span className="eyebrow">{user.role.replace('-', ' ')}</span>
          <h2>{user.businessName || user.name}</h2>
          <p>{user.email}</p>
        </div>
        <nav>
          <a href="#overview">Overview</a>
          <a href="#events">Events</a>
          <a href="#orders">Orders & tickets</a>
          <a href="#check-in">Check-in</a>
          {organizer && (
            <>
              <a href="#profile">Profile</a>
              <a href="#sales">Sales & reports</a>
              <a href="#guests">Guests & discounts</a>
              <a href="#announcements">Announcements</a>
              <a href="#payouts">Payouts</a>
              <a href="#team">Team</a>
            </>
          )}
          {!organizer && (
            <>
              <a href="#users">Users</a>
              <a href="#operations">Operations</a>
            </>
          )}
          {superAdmin && <a href="#settings">System settings</a>}
        </nav>
        <button onClick={logout}>Log out</button>
      </aside>
      <main className="dashboard-main">
        <header>
          <div>
            <span className="eyebrow">Abuja operations</span>
            <h1>{organizer ? 'Organizer' : superAdmin ? 'Super Admin' : 'Admin'} dashboard</h1>
          </div>
          <a className="button button-coral" href="/">
            View site
          </a>
        </header>
        {(notice || error) && (
          <div className={error ? 'dashboard-alert error' : 'dashboard-alert'}>
            {error || notice}
          </div>
        )}
        <section id="overview">
          <div className="metric-grid">
            <article>
              <span>Events</span>
              <b>{data.metrics.events}</b>
            </article>
            <article>
              <span>Paid orders</span>
              <b>{data.metrics.orders}</b>
            </article>
            <article>
              <span>Tickets issued</span>
              <b>{data.metrics.tickets}</b>
            </article>
            <article>
              <span>{organizer ? 'Net earnings' : 'Gross revenue'}</span>
              <b>{money(organizer ? data.metrics.organizerEarnings : data.metrics.grossRevenue)}</b>
            </article>
          </div>
        </section>

        <section id="events" className="dashboard-section">
          <div className="dashboard-title">
            <div>
              <span className="eyebrow">Events</span>
              <h2>{organizer ? 'Create and manage' : 'Platform inventory'}</h2>
            </div>
          </div>
          {organizer && (
            <div className="dashboard-callout">
              <div>
                <b>Six-step event studio</b>
                <p>
                  Build the page, ticket inventory, attendee questions, and approval submission with
                  autosaved drafts.
                </p>
              </div>
              <a className="button button-coral" href="/dashboard/organizer/events/new">
                Create an event
              </a>
            </div>
          )}
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Venue</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((event: any) => (
                  <tr key={event.id}>
                    <td>{event.title}</td>
                    <td>{event.venue}</td>
                    <td>
                      {event.startsAt
                        ? new Date(event.startsAt).toLocaleDateString('en-NG')
                        : 'Not set'}
                    </td>
                    <td>{event.reviewStatus || event._status}</td>
                    <td>
                      {organizer ? (
                        <a
                          className="table-action"
                          href={`/dashboard/organizer/events/${event.id}/edit`}
                        >
                          Resume / edit
                        </a>
                      ) : event.reviewStatus === 'pending' ? (
                        <form
                          onSubmit={(formEvent) => submit(formEvent, '/api/dashboard/event-review')}
                        >
                          <input type="hidden" name="eventId" value={event.id} />
                          <input
                            name="reviewNote"
                            aria-label="Review note"
                            placeholder="Optional note"
                          />
                          <select name="decision">
                            <option value="approved">Approve</option>
                            <option value="rejected">Reject</option>
                          </select>
                          <button className="table-action">Apply</button>
                        </form>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {organizer && (
            <div className="event-settings-grid">
              {data.events.map((event: any) => (
                <details key={event.id}>
                  <summary>{event.title} settings</summary>
                  <form
                    className="dashboard-form compact"
                    onSubmit={(formEvent) => submit(formEvent, '/api/dashboard/event-settings')}
                  >
                    <input type="hidden" name="eventId" value={event.id} />
                    <label>
                      Title
                      <input name="title" defaultValue={event.title} required />
                    </label>
                    <label>
                      Venue
                      <input name="venue" defaultValue={event.venue} required />
                    </label>
                    <label>
                      Capacity
                      <input
                        name="capacity"
                        type="number"
                        min="1"
                        defaultValue={event.capacity}
                        required
                      />
                    </label>
                    <label>
                      Check-in
                      <select name="checkInStatus" defaultValue={event.checkInStatus}>
                        <option value="closed">Closed</option>
                        <option value="open">Open</option>
                      </select>
                    </label>
                    <button className="button button-dark">Save event settings</button>
                  </form>
                  <form
                    className="dashboard-form compact"
                    onSubmit={(formEvent) => submit(formEvent, '/api/dashboard/ticket-types')}
                  >
                    <input type="hidden" name="eventId" value={event.id} />
                    <label>
                      New ticket category
                      <input name="name" required />
                    </label>
                    <label>
                      Description
                      <input name="description" />
                    </label>
                    <label>
                      Price
                      <input name="price" type="number" min="0" required />
                    </label>
                    <label>
                      Quantity
                      <input name="quantity" type="number" min="1" required />
                    </label>
                    <button className="button button-coral">Add ticket category</button>
                  </form>
                  <div className="chip-list">
                    {data.ticketTypes
                      .filter((ticket: any) => String(ticket.event) === String(event.id))
                      .map((ticket: any) => (
                        <span key={ticket.id}>
                          {ticket.name} · {money(ticket.price)} · {ticket.quantity}
                        </span>
                      ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>

        <section id="orders" className="dashboard-section">
          <div className="dashboard-title">
            <div>
              <span className="eyebrow">Commerce</span>
              <h2>Orders and attendees</h2>
            </div>
          </div>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order: any) => (
                  <tr key={order.id}>
                    <td>{order.reference}</td>
                    <td>{order.customer.email}</td>
                    <td>{money(order.total)}</td>
                    <td>{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {organizer && (
          <section id="profile" className="dashboard-section split-panel">
            <div>
              <span className="eyebrow">Public presence</span>
              <h2>Organizer profile</h2>
              <p>
                Build trust with a public organizer page and keep contact and social details
                current.
              </p>
              {data.profile?.slug && (
                <a className="text-link" href={`/organizers/${data.profile.slug}`}>
                  View public profile
                </a>
              )}
            </div>
            <form
              className="dashboard-form compact"
              onSubmit={(event) => submit(event, '/api/dashboard/profile')}
            >
              <label>
                Display / organizer name
                <input
                  name="displayName"
                  required
                  defaultValue={data.profile?.displayName || user.businessName || user.name}
                />
              </label>
              <label>
                Contact name
                <input name="contactName" required defaultValue={user.name} />
              </label>
              <label>
                Logo
                <input name="logo" type="file" accept="image/jpeg,image/png,image/webp" />
              </label>
              <label>
                About
                <textarea name="about" defaultValue={data.profile?.about || user.bio || ''} />
              </label>
              <label>
                Contact email
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={data.profile?.contact?.email || user.email}
                />
              </label>
              <label>
                Contact phone
                <input
                  name="phone"
                  type="tel"
                  required
                  defaultValue={data.profile?.contact?.phone || user.phone || ''}
                />
              </label>
              <label>
                Website
                <input
                  name="website"
                  type="url"
                  defaultValue={data.profile?.social?.website || user.website || ''}
                />
              </label>
              <label>
                Instagram
                <input
                  name="instagram"
                  defaultValue={data.profile?.social?.instagram || ''}
                  placeholder="https://instagram.com/..."
                />
              </label>
              <label>
                Facebook
                <input
                  name="facebook"
                  defaultValue={data.profile?.social?.facebook || ''}
                  placeholder="https://facebook.com/..."
                />
              </label>
              <label>
                TikTok
                <input
                  name="tiktok"
                  defaultValue={data.profile?.social?.tiktok || ''}
                  placeholder="https://tiktok.com/@..."
                />
              </label>
              <button disabled={busy} className="button button-dark">
                Save profile
              </button>
            </form>
          </section>
        )}

        <section id="check-in" className="dashboard-section split-panel">
          <div>
            <span className="eyebrow">Door tools</span>
            <h2>Validate a QR ticket</h2>
            <p>
              Scan with any QR reader or paste the ticket code below. A valid ticket can only be
              checked in once.
            </p>
          </div>
          <form
            className="dashboard-form compact"
            onSubmit={(event) => submit(event, '/api/dashboard/check-in')}
          >
            <label>
              Ticket code
              <input name="code" required />
            </label>
            <button disabled={busy} className="button button-coral">
              Check in guest
            </button>
          </form>
        </section>

        {organizer && (
          <section id="sales" className="dashboard-section">
            <div className="dashboard-title">
              <div>
                <span className="eyebrow">Finance</span>
                <h2>Sales, earnings & reports</h2>
              </div>
              <a className="button button-dark" href="/api/dashboard/reports">
                Download CSV
              </a>
            </div>
            <div className="finance-grid">
              <article>
                <span>Gross ticket sales</span>
                <b>{money(data.metrics.grossRevenue)}</b>
              </article>
              <article>
                <span>Platform commission (5%)</span>
                <b>{money(data.metrics.platformCommission)}</b>
              </article>
              <article>
                <span>Organizer earnings</span>
                <b>{money(data.metrics.organizerEarnings)}</b>
              </article>
              <article>
                <span>Customer service fee</span>
                <b>2%</b>
              </article>
            </div>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((transaction: any) => (
                    <tr key={transaction.id}>
                      <td>{transaction.providerReference}</td>
                      <td>{money(transaction.amount)}</td>
                      <td>{transaction.status}</td>
                      <td>
                        {transaction.verifiedAt
                          ? new Date(transaction.verifiedAt).toLocaleDateString('en-NG')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {organizer && (
          <section id="guests" className="dashboard-section operations-grid">
            <div>
              <span className="eyebrow">Guest list</span>
              <h2>Complimentary tickets</h2>
              <form
                className="dashboard-form compact"
                onSubmit={(event) => submit(event, '/api/dashboard/organizer-operations')}
              >
                <input type="hidden" name="action" value="guest" />
                <label>
                  Event
                  <select name="eventId" required>
                    {data.events.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Guest name
                  <input name="name" required />
                </label>
                <label>
                  Email
                  <input name="email" type="email" required />
                </label>
                <label>
                  Phone
                  <input name="phone" type="tel" />
                </label>
                <label>
                  Quantity
                  <input name="quantity" type="number" min="1" max="20" defaultValue="1" />
                </label>
                <label>
                  Notes
                  <textarea name="notes" />
                </label>
                <button className="button button-dark">Issue complimentary ticket</button>
              </form>
              <div className="chip-list">
                {data.guests.map((guest: any) => (
                  <span key={guest.id}>
                    {guest.name} · {guest.quantity} · {guest.status}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="eyebrow">Promotions</span>
              <h2>Discount codes</h2>
              <form
                className="dashboard-form compact"
                onSubmit={(event) => submit(event, '/api/dashboard/organizer-operations')}
              >
                <input type="hidden" name="action" value="discount" />
                <label>
                  Event
                  <select name="eventId" required>
                    {data.events.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Code
                  <input name="code" required minLength={3} />
                </label>
                <label>
                  Type
                  <select name="kind">
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </label>
                <label>
                  Value
                  <input name="value" type="number" min="1" required />
                </label>
                <label>
                  Usage limit
                  <input name="usageLimit" type="number" min="1" />
                </label>
                <button className="button button-coral">Create discount</button>
              </form>
              <div className="chip-list">
                {data.discounts.map((discount: any) => (
                  <span key={discount.id}>
                    {discount.code} ·{' '}
                    {discount.kind === 'percentage' ? `${discount.value}%` : money(discount.value)}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {organizer && (
          <section id="announcements" className="dashboard-section split-panel">
            <div>
              <span className="eyebrow">Audience</span>
              <h2>Email announcements</h2>
              <p>
                Compose and save announcements now. Outbound email delivery is disabled until you
                choose to activate it later.
              </p>
              <div className="chip-list">
                {data.announcements.map((item: any) => (
                  <span key={item.id}>
                    {item.subject} · {item.deliveryStatus}
                  </span>
                ))}
              </div>
            </div>
            <form
              className="dashboard-form compact"
              onSubmit={(event) => submit(event, '/api/dashboard/organizer-operations')}
            >
              <input type="hidden" name="action" value="announcement" />
              <label>
                Event
                <select name="eventId" required>
                  {data.events.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Audience
                <select name="audience">
                  <option value="all-attendees">All attendees</option>
                  <option value="checked-in">Checked in</option>
                  <option value="not-checked-in">Not checked in</option>
                </select>
              </label>
              <label>
                Subject
                <input name="subject" required />
              </label>
              <label>
                Message
                <textarea name="message" required minLength={10} />
              </label>
              <button className="button button-dark">Save announcement</button>
            </form>
          </section>
        )}

        {organizer && (
          <section className="dashboard-section split-panel">
            <div>
              <span className="eyebrow">Curation</span>
              <h2>Event collections</h2>
              <p>Group related events for internal organization and future campaigns.</p>
              <div className="chip-list">
                {data.collections.map((collection: any) => (
                  <span key={collection.id}>
                    {collection.name} · {collection.events?.length || 0} events
                  </span>
                ))}
              </div>
            </div>
            <form
              className="dashboard-form compact"
              onSubmit={(event) => submit(event, '/api/dashboard/organizer-operations')}
            >
              <input type="hidden" name="action" value="collection" />
              <label>
                Name
                <input name="name" required />
              </label>
              <label>
                Description
                <textarea name="description" />
              </label>
              <label>
                Events
                <select name="events" multiple size={Math.min(6, Math.max(2, data.events.length))}>
                  {data.events.map((event: any) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button button-dark">Create collection</button>
            </form>
          </section>
        )}

        {organizer && (
          <section className="dashboard-section split-panel">
            <div>
              <span className="eyebrow">Settlement</span>
              <h2>Bank verification</h2>
              <p>
                Status: <b>{data.bank?.status || 'Not submitted'}</b>. AZOR TIX verifies settlement
                details before Super Admin can authorize a payout.
              </p>
            </div>
            <form
              className="dashboard-form compact"
              onSubmit={(event) => submit(event, '/api/dashboard/organizer-operations')}
            >
              <input type="hidden" name="action" value="bank" />
              <label>
                Bank name
                <input name="bankName" required defaultValue={data.bank?.bankName || ''} />
              </label>
              <label>
                Bank code
                <input name="bankCode" required defaultValue={data.bank?.bankCode || ''} />
              </label>
              <label>
                Account number
                <input
                  name="accountNumber"
                  required
                  minLength={10}
                  defaultValue={data.bank?.accountNumber || ''}
                />
              </label>
              <label>
                Account name
                <input name="accountName" required defaultValue={data.bank?.accountName || ''} />
              </label>
              <button className="button button-dark">Submit for verification</button>
            </form>
          </section>
        )}

        {organizer && (
          <section id="payouts" className="dashboard-section">
            <span className="eyebrow">Finance</span>
            <h2>Payout history</h2>
            <p className="section-copy">
              Payouts are initiated and authorized only by AZOR TIX Super Admin. Your verified
              earnings and status appear here.
            </p>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payouts.map((payout: any) => (
                    <tr key={payout.id}>
                      <td>{payout.reference}</td>
                      <td>{money(payout.amount)}</td>
                      <td>{payout.status}</td>
                      <td>
                        {payout.paidAt ? new Date(payout.paidAt).toLocaleDateString('en-NG') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {organizer && (
          <section id="team" className="dashboard-section split-panel">
            <div>
              <span className="eyebrow">Team</span>
              <h2>Add a collaborator</h2>
              <div className="chip-list">
                {data.team.map((member: any) => (
                  <span key={member.id}>
                    {member.name} · {member.role}
                  </span>
                ))}
              </div>
            </div>
            <form
              className="dashboard-form compact"
              onSubmit={(event) => submit(event, '/api/dashboard/team')}
            >
              <label>
                Name
                <input name="name" required />
              </label>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Role
                <select name="role">
                  <option value="manager">Manager</option>
                  <option value="check-in">Check-in</option>
                  <option value="analyst">Analyst</option>
                  <option value="finance">Finance</option>
                </select>
              </label>
              <button disabled={busy} className="button button-dark">
                Invite teammate
              </button>
            </form>
          </section>
        )}

        {!organizer && (
          <section id="users" className="dashboard-section">
            <span className="eyebrow">Accounts</span>
            <h2>Organizers and staff</h2>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((account: any) => (
                    <tr key={account.id}>
                      <td>{account.name}</td>
                      <td>{account.email}</td>
                      <td>{account.role}</td>
                      <td>{account.accountStatus}</td>
                      <td>
                        {(account.role === 'organizer' || superAdmin) && (
                          <form onSubmit={(event) => submit(event, '/api/dashboard/user-status')}>
                            <input type="hidden" name="userId" value={account.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={account.accountStatus === 'active' ? 'suspended' : 'active'}
                            />
                            <button className="table-action">
                              {account.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {!organizer && (
          <section id="operations" className="dashboard-section">
            <span className="eyebrow">Support</span>
            <h2>Complaints and reports</h2>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.complaints.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.subject}</td>
                      <td>{item.email}</td>
                      <td>{item.status}</td>
                      <td>
                        {item.status !== 'resolved' && (
                          <form
                            onSubmit={(event) => submit(event, '/api/dashboard/complaint-status')}
                          >
                            <input type="hidden" name="complaintId" value={item.id} />
                            <button className="table-action">Resolve</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {superAdmin && (
          <section className="dashboard-section">
            <span className="eyebrow">Payout controls</span>
            <h2>Super Admin payout authorization</h2>
            <form
              className="dashboard-form payout-authorize"
              onSubmit={(event) => submit(event, '/api/dashboard/payouts')}
            >
              <label>
                Event
                <select name="eventId" required>
                  {data.events.map((event: any) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Amount
                <input name="amount" type="number" min="1000" required />
              </label>
              <button className="button button-coral">Authorize payout</button>
            </form>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payouts.map((payout: any) => (
                    <tr key={payout.id}>
                      <td>{payout.reference}</td>
                      <td>{money(payout.amount)}</td>
                      <td>{payout.status}</td>
                      <td>
                        {['pending', 'approved'].includes(payout.status) && (
                          <form onSubmit={(event) => submit(event, '/api/dashboard/payout-review')}>
                            <input type="hidden" name="payoutId" value={payout.id} />
                            <select name="decision">
                              {payout.status === 'pending' && (
                                <option value="approved">Approve</option>
                              )}
                              {payout.status === 'approved' && (
                                <option value="paid">Mark paid</option>
                              )}
                              <option value="rejected">Reject</option>
                            </select>
                            <button className="table-action">Apply</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {superAdmin && (
          <section className="dashboard-section">
            <span className="eyebrow">Settlement accounts</span>
            <h2>Bank verification</h2>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Account name</th>
                    <th>Bank</th>
                    <th>Account</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bankVerifications.map((bank: any) => (
                    <tr key={bank.id}>
                      <td>{bank.accountName}</td>
                      <td>{bank.bankName}</td>
                      <td>{bank.accountNumber}</td>
                      <td>{bank.status}</td>
                      <td>
                        {bank.status === 'pending' && (
                          <form onSubmit={(event) => submit(event, '/api/dashboard/bank-review')}>
                            <input type="hidden" name="bankId" value={bank.id} />
                            <select name="decision">
                              <option value="verified">Verify</option>
                              <option value="rejected">Reject</option>
                            </select>
                            <button className="table-action">Apply</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {superAdmin && (
          <section id="settings" className="dashboard-section split-panel">
            <div>
              <span className="eyebrow">System controls</span>
              <h2>Financial settings</h2>
              <p>
                Commission: 5% · Customer service fee: 2% · Minimum payout:{' '}
                {money(data.settings?.minimumPayout)}
              </p>
              <p>Email delivery remains disabled.</p>
            </div>
            <form
              className="dashboard-form compact"
              onSubmit={(event) => submit(event, '/api/dashboard/settings')}
            >
              <label>
                Commission %
                <input name="commissionPercent" type="number" value="5" readOnly required />
              </label>
              <label>
                Customer service fee %
                <input name="serviceFeePercent" type="number" value="2" readOnly required />
              </label>
              <label>
                Minimum payout
                <input
                  name="minimumPayout"
                  type="number"
                  min="0"
                  defaultValue={data.settings?.minimumPayout}
                  required
                />
              </label>
              <label>
                Support email
                <input
                  name="supportEmail"
                  type="email"
                  defaultValue={data.settings?.supportEmail}
                  required
                />
              </label>
              <button disabled={busy} className="button button-coral">
                Save settings
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  )
}

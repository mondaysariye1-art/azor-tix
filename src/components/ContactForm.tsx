'use client'

import { FormEvent, useState } from 'react'

export default function ContactForm() {
  const [status, setStatus] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const response = await fetch('/api/complaints', { method: 'POST', body: new FormData(form) })
    const result = await response.json()
    setStatus(result.message || result.error)
    if (response.ok) form.reset()
  }
  return (
    <form className="auth-card" onSubmit={submit}>
      <span className="eyebrow">Support request</span>
      <label>
        Name
        <input name="name" required minLength={2} />
      </label>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Subject
        <input name="subject" required minLength={4} />
      </label>
      <label>
        Order reference (optional)
        <input name="orderReference" />
      </label>
      <label>
        Message
        <textarea name="message" required minLength={20} />
      </label>
      {status && <p className="form-success">{status}</p>}
      <button className="button button-coral">Send request</button>
    </form>
  )
}

'use client'

import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center max-w-sm p-8">
          <h1 className="text-2xl font-semibold mb-2">Check your email</h1>
          <p className="text-zinc-500 text-sm">
            If that email is registered, a reset link has been sent.
          </p>
          <a href="/login" className="text-teal-600 hover:underline text-sm mt-4 block">
            Back to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 bg-white dark:bg-zinc-800 p-8 rounded-xl shadow"
      >
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <p className="text-zinc-500 text-sm">
          Enter your email and we&apos;ll send a reset link.
        </p>
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-zinc-700 dark:border-zinc-600"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        >
          {loading ? 'Sending\u2026' : 'Send reset link'}
        </button>
        <p className="text-sm text-center text-zinc-500">
          <a href="/login" className="text-teal-600 hover:underline">
            Back to login
          </a>
        </p>
      </form>
    </div>
  )
}

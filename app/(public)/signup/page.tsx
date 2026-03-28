'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function SignupPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, confirmPassword }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    // Account created — sign in automatically
    await signIn('credentials', { email, password, redirect: false })
    window.location.href = '/map'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 bg-white dark:bg-zinc-800 p-8 rounded-xl shadow"
      >
        <h1 className="text-2xl font-semibold">Create account</h1>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <input
          name="name"
          type="text"
          placeholder="Your name"
          required
          className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-zinc-700 dark:border-zinc-600"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-zinc-700 dark:border-zinc-600"
        />
        <input
          name="password"
          type="password"
          placeholder="Password (min 8 characters)"
          required
          className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-zinc-700 dark:border-zinc-600"
        />
        <input
          name="confirmPassword"
          type="password"
          placeholder="Confirm password"
          required
          className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-zinc-700 dark:border-zinc-600"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        >
          {loading ? 'Creating account\u2026' : 'Create account'}
        </button>
        <p className="text-sm text-center text-zinc-500">
          Already have an account?{' '}
          <a href="/login" className="text-teal-600 hover:underline">
            Log in
          </a>
        </p>
      </form>
    </div>
  )
}

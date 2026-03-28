'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    const newPassword = (form.elements.namedItem('newPassword') as HTMLInputElement).value
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    router.push('/login?reset=success')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-4 bg-white dark:bg-zinc-800 p-8 rounded-xl shadow"
    >
      <h1 className="text-2xl font-semibold">Set new password</h1>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <input
        name="newPassword"
        type="password"
        placeholder="New password (min 8 characters)"
        required
        className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-zinc-700 dark:border-zinc-600"
      />
      <input
        name="confirmPassword"
        type="password"
        placeholder="Confirm new password"
        required
        className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-zinc-700 dark:border-zinc-600"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
      >
        {loading ? 'Updating\u2026' : 'Update password'}
      </button>
    </form>
  )
}

'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const resetSuccess = searchParams.get('reset') === 'success'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    const result = await signIn('credentials', {
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      password: (form.elements.namedItem('password') as HTMLInputElement).value,
      callbackUrl: '/map',
      redirect: false,
    })
    if (result?.error) setError('Invalid email or password')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-4 bg-white dark:bg-zinc-800 p-8 rounded-xl shadow"
    >
      <h1 className="text-2xl font-semibold">Log in</h1>
      {resetSuccess && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Password updated — please sign in
        </p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
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
        placeholder="Password"
        required
        className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-zinc-700 dark:border-zinc-600"
      />
      <button
        type="submit"
        className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
      >
        Log in
      </button>
      <p className="text-sm text-center text-zinc-500">
        <a href="/forgot-password" className="text-teal-600 hover:underline">
          Forgot password?
        </a>
      </p>
      <p className="text-sm text-center text-zinc-500">
        Don&apos;t have an account?{' '}
        <a href="/signup" className="text-teal-600 hover:underline">
          Sign up
        </a>
      </p>
    </form>
  )
}

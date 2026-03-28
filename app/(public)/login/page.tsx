import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}

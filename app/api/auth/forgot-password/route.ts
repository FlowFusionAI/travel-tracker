import { NextRequest, NextResponse } from 'next/server'
import { listRecords } from '@/lib/airtable'
import { signResetToken } from '@/lib/auth-helpers'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  // Silently process — always return 200 to prevent email enumeration
  try {
    const safeEmail = String(email ?? '').replace(/'/g, "\\'")
    const users = await listRecords('Users', `{Email} = '${safeEmail}'`)

    if (users.length > 0) {
      const user = users[0]
      const token = await signResetToken(String(email))
      const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`

      await fetch(process.env.N8N_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: String(email),
          name: user.Name ?? '',
          resetLink,
        }),
      })
    }
  } catch (err) {
    // Log server-side only — never expose to client
    console.error('[forgot-password]', err)
  }

  return NextResponse.json({ success: true })
}

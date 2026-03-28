import { NextRequest, NextResponse } from 'next/server'
import { listRecords, updateRecord } from '@/lib/airtable'
import { verifyResetToken, hashPassword } from '@/lib/auth-helpers'

export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json()

  if (!token || !newPassword) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if ((newPassword as string).length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    )
  }

  let email: string
  try {
    const payload = await verifyResetToken(token as string)
    email = payload.email
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired reset link. Please request a new one.' },
      { status: 400 }
    )
  }

  try {
    const safeEmail = email.replace(/'/g, "\\'")
    const users = await listRecords('Users', `{Email} = '${safeEmail}'`)
    if (!users.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const hash = await hashPassword(newPassword as string)
    await updateRecord('Users', users[0].id as string, { 'Password Hash': hash })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reset-password]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

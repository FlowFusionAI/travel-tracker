import { NextRequest, NextResponse } from 'next/server'
import { listRecords, createRecord } from '@/lib/airtable'
import { hashPassword } from '@/lib/auth-helpers'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, email, password, confirmPassword } = body

  if (!name || !email || !password || !confirmPassword) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
  }
  if ((password as string).length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    )
  }

  try {
    const existing = await listRecords('Users', `{Email} = '${String(email)}'`)
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const hash = await hashPassword(password as string)
    await createRecord('Users', {
      Name: name,
      Email: email,
      'Password Hash': hash,
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('[signup]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

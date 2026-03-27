import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const RESET_SECRET = new TextEncoder().encode(process.env.RESET_TOKEN_SECRET!)

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Sign a 15-minute JWT reset token containing the user's email.
 * Signed with RESET_TOKEN_SECRET — separate from AUTH_SECRET so
 * compromising one doesn't affect the other.
 */
export async function signResetToken(email: string): Promise<string> {
  return new SignJWT({ email, purpose: 'password_reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(RESET_SECRET)
}

/**
 * Verify a reset token. Throws if expired, invalid signature, or wrong purpose.
 * Returns the email extracted from the token payload.
 */
export async function verifyResetToken(token: string): Promise<{ email: string }> {
  const { payload } = await jwtVerify(token, RESET_SECRET)
  if (payload.purpose !== 'password_reset') {
    throw new Error('Invalid token purpose')
  }
  return { email: payload.email as string }
}

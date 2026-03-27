import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { listRecords } from '@/lib/airtable'
import { verifyPassword } from '@/lib/auth-helpers'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Escape single quotes in email to prevent filterByFormula injection
        const safeEmail = String(credentials.email).replace(/'/g, "\\'")
        const users = await listRecords('Users', `{Email} = '${safeEmail}'`)
        if (!users.length) return null

        const user = users[0]
        const isValid = await verifyPassword(
          credentials.password as string,
          (user['Password Hash'] as string) ?? ''
        )
        if (!isValid) return null

        return {
          id: user.id as string,
          email: user.Email as string,
          name: user.Name as string,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // Persist the Airtable record ID in the JWT on first login
      if (user?.id) token.id = user.id
      return token
    },
    session({ session, token }) {
      // Expose the Airtable record ID on the session object
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})

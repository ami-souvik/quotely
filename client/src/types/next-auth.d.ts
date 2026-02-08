import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      org_id?: string
      org_name?: string
      role?: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    org_id?: string
    org_name?: string
    role?: string
    username?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    org_id?: string
    org_name?: string
    role?: string
  }
}

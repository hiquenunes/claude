import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { REQUIRED_SCOPES } from "@jarvis/core";

const allowedEmail = process.env.ALLOWED_EMAIL?.toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: REQUIRED_SCOPES.join(" "),
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Single-user tool: only Henrique's own Google account may sign in.
      // Unset ALLOWED_EMAIL is treated as "not configured yet" and blocks everyone.
      if (!allowedEmail) return false;
      return user.email?.toLowerCase() === allowedEmail;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.refreshToken = token.refreshToken as string | undefined;
      session.expiresAt = token.expiresAt as number | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

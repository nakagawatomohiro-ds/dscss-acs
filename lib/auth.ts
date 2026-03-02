import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getOrCreateUser } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      try {
        await getOrCreateUser({
          email: user.email,
          name: user.name,
          image: user.image,
          googleId: account?.providerAccountId,
        });
        return true;
      } catch (e) {
        console.error("Error creating user:", e);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.email) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
});

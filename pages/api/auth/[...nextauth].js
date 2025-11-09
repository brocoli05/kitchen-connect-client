// pages/api/auth/[...nextauth].js

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    // get user data after successful sign-in
    async jwt({ token, user, account }) {
      if (account && user) {
        // Send the account's access token or ID token to custom API
        token.backendToken = account.id_token || account.access_token;
        token.user = user;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose the token to the session object for use on the client-side
      session.backendToken = token.backendToken;
      session.user = token.user;
      return session;
    },
  },

  // Set up pages to redirect users to your custom login page
  pages: {
    signIn: "/login",
  },
});

import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

import { FirestoreAdapter } from '@auth/firebase-adapter';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!admin.apps.length) {
  if (!serviceAccountPath) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_PATH environment variable not set.',
    );
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

const db = getFirestore();

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  adapter: FirestoreAdapter(db),
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.idToken = token.idToken;
      return session;
    },
    secret: process.env.NEXTAUTH_SECRET,
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

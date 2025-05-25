import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

import { FirestoreAdapter } from '@auth/firebase-adapter';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore'; // Keep this

if (!admin.apps.length) {
  const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJsonString) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set or empty.',
    );
  }
  try {
    const serviceAccount = JSON.parse(serviceAccountJsonString);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // Optionally, specify databaseURL if not automatically inferred or if you have multiple DBs
      // databaseURL: `https://your-project-id.firebaseio.com`
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    console.error(
      'Check if FIREBASE_SERVICE_ACCOUNT_JSON is a valid JSON string.',
    );
    throw new Error(
      'Failed to initialize Firebase Admin SDK. Ensure FIREBASE_SERVICE_ACCOUNT_JSON is set correctly.',
    );
  }
}

// You can still get the Firestore instance like this for the adapter
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

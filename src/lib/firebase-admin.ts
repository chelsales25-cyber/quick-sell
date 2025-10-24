import admin from 'firebase-admin';

const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON;

if (!admin.apps.length && serviceAccountB64) {
  try {
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountB64, 'base64').toString('utf-8')
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error: ', error);
    if (error instanceof SyntaxError) {
      console.error(
        '\n*** Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY_JSON. Make sure it is a valid base64 encoded JSON. ***\n'
      );
    }
  }
} else if (!serviceAccountB64) {
  if (process.env.NODE_ENV !== 'production') {
    console.error(
      '\n*** FIREBASE_SERVICE_ACCOUNT_KEY_JSON environment variable is not set. ***'
    );
    console.error(
      'For local development, create a .env.local file and add the base64 encoded content of your service account key file.'
    );
    console.error(
      'Example .env.local:\nFIREBASE_SERVICE_ACCOUNT_KEY_JSON=PASTE_YOUR_BASE64_STRING_HERE\n'
    );
    console.error(
      'You can convert your JSON file to base64 using an online tool or a command-line utility.'
    );
  } else {
    console.error(
      'Firebase Admin initialization failed: Service account credentials not found in environment variables.'
    );
  }
}

const adminAuth = admin.apps.length ? admin.auth() : undefined;
const adminDb = admin.apps.length ? admin.firestore() : undefined;

export { adminDb, adminAuth };

import { google } from 'googleapis';

let auth: ReturnType<typeof createGoogleAuth> | null = null;

/**
 * Creates and caches a GoogleAuth client instance.
 * This function uses a more robust method for handling credentials
 * by expecting the entire service account JSON to be base64 encoded
 * in a single environment variable.
 */
function createGoogleAuth() {
  const credentialsB64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON;
  if (!credentialsB64) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY_JSON environment variable is not set. This is required for Google API authentication.'
    );
  }

  const credentials = JSON.parse(
    Buffer.from(credentialsB64, 'base64').toString('utf-8')
  );

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

/** Singleton instance of GoogleAuth */
export const getGoogleAuth = () => (auth ??= createGoogleAuth());

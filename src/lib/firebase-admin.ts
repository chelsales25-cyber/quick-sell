import admin from "firebase-admin";

// IMPORTANT: Replace with your service account credentials
// You can generate this file in the Firebase console:
// Project settings > Service accounts > Generate new private key
// Ensure the file is named 'serviceAccountKey.json' and is in the root of your project.
try {
  const serviceAccount = require("../config/serviceAccountKey.json");

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      //   storageBucket: "studio-7884642390-af176.appspot.com",
    });
  }
} catch (error) {
  console.error("Firebase Admin initialization error: ", error);
  if ((error as any).code === "MODULE_NOT_FOUND") {
    console.error(
      "\n*** Firebase Admin SDK Service Account key not found. ***"
    );
    console.error(
      "Please download your service account key from the Firebase console and place it as 'serviceAccountKey.json' in the root of your project."
    );
    console.error(
      "The gallery page will not be able to load images from Storage without it.\n"
    );
  }
}
const adminAuth = admin.apps.length ? admin.auth() : undefined;
const adminDb = admin.apps.length ? admin.firestore() : undefined;

export { adminDb, adminAuth };

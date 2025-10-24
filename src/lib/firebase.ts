
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBXxISR3G6ldbcrTrDfBsWzsA_veHQqTnk",
  authDomain: "quicksell-5e9f5.firebaseapp.com",
  projectId: "quicksell-5e9f5",
  storageBucket: "quicksell-5e9f5.firebasestorage.app",
  messagingSenderId: "422658036746",
  appId: "1:422658036746:web:75d1db071ebfec3bdf3bf3",
  measurementId: "G-RKNJ5Y6106"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

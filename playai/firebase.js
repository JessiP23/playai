// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB2bVn64sy8Tyupgf25_yUtrM60ubF4fVo",
  authDomain: "playai-1694d.firebaseapp.com",
  projectId: "playai-1694d",
  storageBucket: "playai-1694d.firebasestorage.app",
  messagingSenderId: "879844785339",
  appId: "1:879844785339:web:799b1ac3fa5be4c7c6fd9e",
  measurementId: "G-NX9PBF7VF3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
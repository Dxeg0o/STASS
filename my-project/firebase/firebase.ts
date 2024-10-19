// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAQMSv2LFpSkKkTQjc-vQZr2zsKwk1B20Q",
  authDomain: "stass-6561a.firebaseapp.com",
  projectId: "stass-6561a",
  storageBucket: "stass-6561a.appspot.com",
  messagingSenderId: "160412130138",
  appId: "1:160412130138:web:6b7ec25f0b8f5911643163",
  measurementId: "G-36RFDPVW11",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// utils/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAQMSv2LFpSkKkTQjc-vQZr2zsKwk1B20Q",
  authDomain: "stass-6561a.firebaseapp.com",
  projectId: "fir-demo-project",
  storageBucket: "fir-demo-project.appspot.com",
  messagingSenderId: "160412130138",
  appId: "1:160412130138:web:6b7ec25f0b8f5911643163",
  measurementId: "G-36RFDPVW11",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };

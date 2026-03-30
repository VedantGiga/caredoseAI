import { initializeApp } from "firebase/app";
import { initializeAuth, getAuth, GoogleAuthProvider } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Lazy loading to avoid crash in Expo Go
export const getGoogleSignin = () => {
  try {
    const { GoogleSignin } = require("@react-native-google-signin/google-signin");
    GoogleSignin.configure({
      webClientId: "11346501687-s2obm485tj93tn2steokha14v3nok7va.apps.googleusercontent.com",
    });
    return GoogleSignin;
  } catch (e) {
    return null;
  }
};

const firebaseConfig = {
  apiKey: "AIzaSyAe1SQ0kvFJ_JFh2VuPgvFYhnBA7HJMoo0",
  authDomain: "caredoseai.firebaseapp.com",
  projectId: "caredoseai",
  storageBucket: "caredoseai.firebasestorage.app",
  messagingSenderId: "11346501687",
  appId: "1:11346501687:web:62cd0ae2ffed7528e1dfb2",
  measurementId: "G-VMH7VQZJFS"
};

const app = initializeApp(firebaseConfig);

// Persistence helper specifically for React Native to ensure session stability
const getRNPersistence = () => {
  try {
    const { getReactNativePersistence } = require("firebase/auth");
    return getReactNativePersistence(ReactNativeAsyncStorage);
  } catch (e) {
    return undefined;
  }
};

export const auth = initializeAuth(app, {
  persistence: getRNPersistence(),
});

export const googleProvider = new GoogleAuthProvider();

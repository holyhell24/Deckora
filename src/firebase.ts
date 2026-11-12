import { getApp, getApps, initializeApp } from '@firebase/app';
import { getAuth } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDNGcG7PtqVpfTxgD_M6rpxjvZ9aYZpcUo',
  authDomain: 'deckora-c8b26.firebaseapp.com',
  projectId: 'deckora-c8b26',
  storageBucket: 'deckora-c8b26.firebasestorage.app',
  messagingSenderId: '2655712266',
  appId: '1:2655712266:web:9eded7bf70c59ff1559bf3',
};

export const firebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
